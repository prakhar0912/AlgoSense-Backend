import { Worker } from "bullmq"
import services from "../../../config/services.js"
import { Problem, ShortSubmission, Submission, User, UserScores } from "../../../entities/index.js"
import { InternalServerError, NotFoundError, UnauthorizedError } from "../../../errors/index.js"
import type { ISubmissionDAO, IValidatorResult, ModelResponse } from "../../../interfaces/index.js"
import { runInTransaction } from "../../data-access/client.js"



export const worker = new Worker(
  'submission-evaluation-queue',
  async (job) => {
    const submissionDAOInstance = new services.submission.DAO()
    let submissionId: string = job.data
    console.log("Worker Started on: ", submissionId)
    let initialSubmission: Pick<Submission, 'status' | 'timer' | 'problem_id' | 'submitted_at' | 'user_id' | 'user_input' | 'hints_used' | 'id'>
    try {
      initialSubmission = await submissionDAOInstance.updateStatus(submissionId, "evaluating")
    }
    catch (e) {
      throw new InternalServerError('Error while updating Submission from DB')
    }
    await runInTransaction<void>(async (client) => {
      const submissionDAO = new services.submission.DAO(client)
      const userDAO = new services.user.DAO(client)
      const problemDAO = new services.problem.DAO(client)


      let problem: Problem | null
      try {
        problem = await problemDAO.findById(initialSubmission.problem_id)
      }
      catch (e) {
        throw new InternalServerError('Error while fetching problem from DB')
      }
      if (!problem) {
        throw new NotFoundError('Problem not found in DB')
      }

      let modelResp
      try {
        modelResp = await services.utils.askGPT(problem, initialSubmission.user_input)
      }
      catch (e) {
        throw new InternalServerError('Error while fetching response from model', e)
      }

      let validatedModelResp: IValidatorResult<ModelResponse>
      try {
        validatedModelResp = services.problem.validators.modelResponseValidator.validate(modelResp)
      }
      catch (e) {
        throw new InternalServerError('Error while validating model response')
      }

      const { data, errors } = validatedModelResp
      if (errors && errors.length > 0 || !data) {
        throw new InternalServerError('The model responded incorrectly', errors)
      }

      let validatedData: ModelResponse = data
      // console.log("Validated Model Response", validatedData)

      let finalEdgeCaseData: Submission['edge_cases'] = []
      let earned = 0
      let max = 0

      for (const edgeCase of validatedData.edge_cases) {
        max += services.weights.edgeCaseImportanceWeights[edgeCase.importance as keyof typeof services.weights.edgeCaseImportanceWeights];
        earned += services.weights.edgeCaseImportanceWeights[edgeCase.importance as keyof typeof services.weights.edgeCaseImportanceWeights] * services.weights.edgeCaseCoverageWeights[edgeCase.coverage as keyof typeof services.weights.edgeCaseCoverageWeights]

        finalEdgeCaseData.push({
          description: edgeCase.case,
          coverage: edgeCase.coverage,
          importance: edgeCase.importance,
        } as never)
      }

      let edgeCaseScore = 100
      if (max !== 0 && !Number.isNaN(earned) && !Number.isNaN(max)) {
        edgeCaseScore = Math.ceil((earned / max) * 100)
      }

      const finalApproachScore = services.weights.approachScoreWeights[data['user_explanation_rating'] as keyof typeof services.weights.approachScoreWeights]

      let user: User | null
      try {
        user = await userDAO.findByIdForUpdate(initialSubmission.user_id)
      }
      catch (e) {
        throw new InternalServerError('Unable to fetch user from DB.', e)
      }
      if (!user) {
        throw new UnauthorizedError('AlgoSense account not found!')
      }
      const {
        mergedApproachScore,
        mergedEdgeCaseScore,
        totalScore,
        numberOfAttempts
      } = await calculateNewUserScores(initialSubmission.user_id, user.scores, problem.id, finalApproachScore, edgeCaseScore, problem.difficulty, submissionDAO)

      let userEloRating: number | undefined = Number.isNaN(user.scores?.elo_rating) ? user.scores?.initial_elo_rating : user.scores?.elo_rating
      if (Number.isNaN(userEloRating) || !userEloRating) {
        userEloRating = 1500
      }

      const ratingChange = calculateRatingChange(problem, userEloRating, user.scores, finalApproachScore, edgeCaseScore, numberOfAttempts)

      // console.log("Rating Change: ", ratingChange)
      if (Number.isNaN(ratingChange)) {
        throw new InternalServerError('Rating Change value is not a number')
      }


      let topicRatingsChange: Record<string, number> = {}
      for (const topic of problem.primary_topics) {
        if (user.scores?.topic_ratings && Object.hasOwn(user.scores?.topic_ratings, topic)) {
          topicRatingsChange[topic as keyof typeof user.scores.topic_ratings] =
            user.scores.topic_ratings[topic as keyof typeof user.scores.topic_ratings] === 0 ?
              userEloRating + ratingChange :
              user.scores.topic_ratings[topic as keyof typeof user.scores.topic_ratings] + ratingChange
        }
      }
      for (const topic of problem.secondary_topics) {
        if (user.scores?.topic_ratings && Object.hasOwn(user.scores?.topic_ratings, topic)) {
          topicRatingsChange[topic as keyof typeof user.scores.topic_ratings] =
            user.scores?.topic_ratings[topic as keyof typeof user.scores.topic_ratings] === 0 ?
              userEloRating + 0.5 * ratingChange :
              user.scores?.topic_ratings[topic as keyof typeof user.scores.topic_ratings] + 0.5 * ratingChange
        }
      }


      let submissionData: Required<Submission>
      try {
        submissionData = await submissionDAO.createFinalSubmission({
          id: initialSubmission.id,
          problem_title: problem.title,
          difficulty: problem.difficulty,
          problem_rating: problem.rating,
          approach_score: finalApproachScore,
          identified_approach: validatedData.user_explanation_identified_apporach,
          pass: validatedData.user_explanation_pass,
          missing_points: validatedData.missing_points_in_user_explanation,
          edge_cases: finalEdgeCaseData,
          edge_case_score: edgeCaseScore,
          elo_diff: ratingChange,
          status: "completed"
        })
      }
      catch (e) {
        throw new InternalServerError('Failed to add submission to database', e)
      }

      // console.log("Final Submission: ", submissionData)

      // console.log('Final User Scores: ', {
      //   approaches_score: mergedApproachScore,
      //   edge_case_score: mergedEdgeCaseScore,
      //   total_score: totalScore,
      //   elo_rating: userEloRating + ratingChange,
      //   topic_ratings: topicRatingsChange
      // })

      let updatedUserScores: UserScores
      try {
        updatedUserScores = await userDAO.setUserScores(initialSubmission.user_id, {
          approaches_score: mergedApproachScore,
          edge_case_score: mergedEdgeCaseScore,
          total_score: totalScore,
          elo_rating: userEloRating + ratingChange,
          topic_ratings: topicRatingsChange
        })
      }
      catch (e) {
        throw new InternalServerError('Unable to store new Scores.')
      }

      // console.log("Profile Updated Scores: ", updatedUserScores)


      let last5submissions = user.last_5_submissions && Array.isArray(user.last_5_submissions) ? user.last_5_submissions : []

      const newestToOldest = buildNewLast5Submissions(submissionData, last5submissions)

      let updatedShortSubmissions: ShortSubmission[]
      try {
        updatedShortSubmissions = await userDAO.setSubmissionsInProfile(initialSubmission.user_id, newestToOldest)
      }
      catch (e) {
        throw new InternalServerError('Unable to store new Submission Data to Database.')
      }
      // console.log("Updated Short Submissions: ", updatedShortSubmissions)
      console.log("Finished processing: ", submissionData.id)
    })
  },
  {
    connection: {
      host: 'localhost',
      port: 6379
    },
    concurrency: 5
  }
)


function calculateRatingChange(problem: Problem, userEloRating: number, userScores: UserScores | null | undefined, finalApproachScore: number, edgeCaseScore: number, numberOfAttempts: number) {

  const userPerformance: number = 0.55 * (finalApproachScore / 100) +
    0.25 * (edgeCaseScore / 100) +
    0.20 * (services.weights.problemDifficultyWeights[problem.difficulty as keyof typeof services.weights.problemDifficultyWeights] / 100)

  // console.log("User Performance: ", userPerformance)

  let effectiveUserRating: number = 0.5 * userEloRating

  let totalPrimaryTopicRating: number = 0
  for (const topic of problem.primary_topics) {
    if (userScores?.topic_ratings && Object.hasOwn(userScores?.topic_ratings, topic)) {
      totalPrimaryTopicRating +=
        userScores?.topic_ratings[topic as keyof typeof userScores.topic_ratings]
    }
  }
  const weightedAveragePrimaryTopicRating: number =
    Number.isNaN(totalPrimaryTopicRating / problem.primary_topics.length)
      || totalPrimaryTopicRating === 0 ?
      0.3 * userEloRating : 0.3 * (totalPrimaryTopicRating / problem.primary_topics.length)

  let totalSecondaryTopicRating: number = 0
  for (const topic of problem.secondary_topics) {
    if (userScores?.topic_ratings && Object.hasOwn(userScores?.topic_ratings, topic)) {
      totalSecondaryTopicRating +=
        userScores?.topic_ratings[topic as keyof typeof userScores.topic_ratings]
    }
  }
  const weightedAverageSecondaryTopicRating: number =
    Number.isNaN(totalSecondaryTopicRating / problem.secondary_topics.length) ||
      totalSecondaryTopicRating === 0 ?
      0.2 * userEloRating : 0.2 * (totalSecondaryTopicRating / problem.secondary_topics.length)

  effectiveUserRating += weightedAveragePrimaryTopicRating + weightedAverageSecondaryTopicRating

  effectiveUserRating = Math.floor(effectiveUserRating)


  // console.log("Effective User Rating: ", effectiveUserRating)
  const expectedUserPerformance = 1 / (1 + Math.pow(10, (problem.rating - effectiveUserRating) / 400))

  // console.log("Expected user performance: ", expectedUserPerformance)

  let numberOfAttemptsModifier = 1
  if (numberOfAttempts >= services.weights.numberOfAttemptsModifier.maxNumber) {
    numberOfAttemptsModifier = services.weights.numberOfAttemptsModifier.maxValue
  }
  else {
    numberOfAttemptsModifier = services.weights.numberOfAttemptsModifier[numberOfAttempts as keyof typeof services.weights.numberOfAttemptsModifier]
  }

  // console.log("Attempt based modifier: ", numberOfAttemptsModifier)

  const ratingChange = numberOfAttemptsModifier * services.weights.elo_k_weight * (userPerformance - expectedUserPerformance)
  return ratingChange
}

async function calculateNewUserScores(userId: string, userScores: UserScores | null | undefined, problemId: string, newApproachScore: number, newEdgeCaseScore: number, problemDifficulty: string, submissionDAO: ISubmissionDAO) {
  let userSubmissionsData: { approach_score: number, submitted_at: string, difficulty: string, edge_case_score: number, problem_id: string }[] | []

  try {
    userSubmissionsData = await submissionDAO.viewScoresByUser(userId)
  }
  catch (e) {
    throw new InternalServerError('Failed to fetch user submissions from the database', e)
  }

  let weightedScore = 0;
  let totalWeight = 0;
  let weightedEdgeScore = 0
  let numberOfAttempts = 0

  for (const submission of userSubmissionsData) {
    if (submission.problem_id === problemId) {
      numberOfAttempts++
    }

    const weight = services.weights.problemDifficultyWeights[submission.difficulty as keyof typeof services.weights.problemDifficultyWeights];

    weightedEdgeScore += submission.edge_case_score * weight
    weightedScore += submission.approach_score * weight;
    totalWeight += weight;
  }

  const weight = services.weights.problemDifficultyWeights[problemDifficulty as keyof typeof services.weights.problemDifficultyWeights]
  weightedScore += newApproachScore * weight
  weightedEdgeScore += newEdgeCaseScore * weight
  totalWeight += weight

  let mergedApproachScore = Number.isNaN(weightedScore / totalWeight) ? 0 : Math.round(weightedScore / totalWeight);
  let mergedEdgeCaseScore = Number.isNaN(weightedEdgeScore / totalWeight) ? 0 : Math.round(weightedEdgeScore / totalWeight);

  let totalScore = services.weights.totalScoreWeights.approach_score * mergedApproachScore
    + services.weights.totalScoreWeights.edge_case_score * mergedEdgeCaseScore

  if (userScores !== undefined && userScores !== null && Number.isFinite(userScores.consistency_score)) {
    totalScore += services.weights.totalScoreWeights.consistency_score * userScores?.consistency_score
  }
  return { mergedApproachScore, mergedEdgeCaseScore, totalScore, numberOfAttempts }
}

function buildNewLast5Submissions(submissionData: Required<Submission>, last5submissions: ShortSubmission[]) {

  let newestToOldest = [...last5submissions].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));

  while (newestToOldest.length > 4) {
    newestToOldest.pop()
  }

  let newShortSubmission = new ShortSubmission()

  newShortSubmission.submission_id = submissionData.id
  newShortSubmission.problem_id = submissionData.problem_id
  newShortSubmission.problem_title = submissionData.problem_title
  newShortSubmission.difficulty = submissionData.difficulty
  newShortSubmission.timer = submissionData.timer ? submissionData.timer : null
  newShortSubmission.approach_score = submissionData.approach_score
  newShortSubmission.identified_approach = submissionData.identified_approach
  newShortSubmission.pass = submissionData.pass
  newShortSubmission.edge_case_score = submissionData.edge_case_score
  newShortSubmission.submitted_at = submissionData.submitted_at

  newestToOldest.unshift(newShortSubmission)

  return newestToOldest
}

console.log("Worker Started!")
