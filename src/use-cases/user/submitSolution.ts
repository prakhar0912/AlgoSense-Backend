import Problem from "../../entities/problem.js";
import Submission from "../../entities/submission.js";
import UserScores from "../../entities/userScores.js";
import User from "../../entities/user.js";
import InternalServerError from "../../errors/internalServerError.js";
import NotFoundError from "../../errors/notFoundError.js";
import ValidationError from "../../errors/validationError.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type ISubmissionDAO from "../../interfaces/submission/submissionDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import type { IValidatorResult } from "../../interfaces/validator.js";
import type IValidator from "../../interfaces/validator.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import ShortSubmission from "../../entities/shortSubmission.js";
import type ModelResponse from "../../interfaces/problem/modelResponse.js";
import services from "../../config/services.js";



export default class SubmitSolution implements IUseCase<Submission> {
  constructor(
    private userDAO: IUserDAO,
    private problemDAO: IProblemDAO,
    private submissionDAO: ISubmissionDAO,
    private askGPT: (systemPrompt: Problem, userInput: string) => Promise<ModelResponse>,
    private submissionValidator: IValidator<ModelResponse>,
    private userSolutionValidator: IValidator<string>
  ) { }

  async call(userId: string, userScores: User['scores'], last5submissions: User['last_5_submissions'], problemId: string, userInput: string): Promise<Submission> {

    if (typeof userId !== "string" || typeof userId === "string" && userId.trim().length === 0) {
      throw new ValidationError('User ID value invalid')
    }

    if (typeof problemId !== "string" || typeof problemId === "string" && problemId.trim().length === 0) {
      throw new ValidationError('Problem ID value invalid')
    }

    if (typeof userScores === 'undefined') {
      throw new InternalServerError('User Data Malformed, userScores is undefined')
    }


    let validatedUserInput: IValidatorResult<string>
    try {
      validatedUserInput = this.userSolutionValidator.validate(userInput)
    } catch (e) {
      throw new InternalServerError('Error validating user input')
    }
    if (validatedUserInput.errors && validatedUserInput.errors.length > 0 || !validatedUserInput.success || !validatedUserInput.data) {
      throw new ValidationError('User Input Invalid', validatedUserInput.errors)
    }



    let problem: Problem | null | undefined
    try {
      problem = await this.problemDAO.findById(problemId)
    }
    catch (e) {
      throw new InternalServerError('Error while fetching problem from DB')
    }
    if (!problem) {
      throw new NotFoundError('Problem not found in DB')
    }


    let modelResp
    try {
      modelResp = await this.askGPT(problem, validatedUserInput.data)
    }
    catch (e) {
      throw new InternalServerError('Error while fetching response from model', e)
    }

    let validatedModelResp: IValidatorResult<ModelResponse>
    try {
      validatedModelResp = this.submissionValidator.validate(modelResp)
    }
    catch (e) {
      throw new InternalServerError('Error while validating model response')
    }

    const { data, errors } = validatedModelResp
    if (errors && errors.length > 0 || !data) {
      throw new InternalServerError('The model responded incorrectly', errors)
    }

    let validatedData: ModelResponse = data

    console.log("Validated Model Response", validatedData)

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

    const {
      mergedApproachScore,
      mergedEdgeCaseScore,
      totalScore,
      numberOfAttempts
    } = await this.calculateNewUserScores(userId, userScores, problem.id, finalApproachScore, edgeCaseScore, problem.difficulty)

    let userEloRating = userScores?.elo_rating
    if (!userEloRating) {
      userEloRating = 1500
    }

    const ratingChange = this.calculateRatingChange(problem, userEloRating, userId, userScores, finalApproachScore, edgeCaseScore, numberOfAttempts)

    console.log("Rating Change: ", ratingChange)
    if (Number.isNaN(ratingChange)) {
      throw new InternalServerError('Rating Change value is not a number')
    }


    let topicRatingsChange: Record<string, number> = {}
    for (const topic of problem.primary_topics) {
      if (userScores?.topic_ratings && Object.hasOwn(userScores?.topic_ratings, topic)) {
        topicRatingsChange[topic as keyof typeof userScores.topic_ratings] = userScores?.topic_ratings[topic as keyof typeof userScores.topic_ratings] === 0 ?
          userScores.elo_rating + ratingChange :
          userScores?.topic_ratings[topic as keyof typeof userScores.topic_ratings] + ratingChange
      }
    }
    for (const topic of problem.secondary_topics) {
      if (userScores?.topic_ratings && Object.hasOwn(userScores?.topic_ratings, topic)) {
        topicRatingsChange[topic as keyof typeof userScores.topic_ratings] = userScores?.topic_ratings[topic as keyof typeof userScores.topic_ratings] === 0 ?
          userScores.elo_rating + 0.5 * ratingChange :
          userScores?.topic_ratings[topic as keyof typeof userScores.topic_ratings] + 0.5 * ratingChange
      }
    }


    let submissionData: Submission
    try {
      submissionData = await this.submissionDAO.create({
        user_id: userId,
        problem_id: problemId,
        user_input: userInput,
        difficulty: problem.difficulty,
        problem_rating: problem.rating,
        approach_score: finalApproachScore,
        identified_approach: validatedData.user_explanation_identified_apporach,
        pass: validatedData.user_explanation_pass,
        missing_points: validatedData.missing_points_in_user_explanation,
        edge_cases: finalEdgeCaseData,
        edge_case_score: edgeCaseScore,
        submitted_at: new Date().toISOString(),
        elo_diff: ratingChange,
      })
    }
    catch (e) {
      throw new InternalServerError('Failed to add submission to database', e)
    }

    console.log('Final User Scores: ', {
      approaches_score: mergedApproachScore,
      edge_case_score: mergedEdgeCaseScore,
      total_score: totalScore,
      elo_rating: userEloRating + ratingChange,
      topic_ratings: topicRatingsChange
    })

    let updatedUserScores: UserScores
    try {
      updatedUserScores = await this.userDAO.setUserScores(userId, {
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


    last5submissions = last5submissions && Array.isArray(last5submissions) ? last5submissions : []

    const newestToOldest = this.buildNewLast5Submissions(submissionData, last5submissions)

    let updatedShortSubmissions: ShortSubmission[]
    try {
      updatedShortSubmissions = await this.userDAO.setSubmissionsInProfile(userId, newestToOldest)
    }
    catch (e) {
      throw new InternalServerError('Unable to store new Submission Data to Database.')
    }

    return submissionData
  }

  calculateRatingChange(problem: Problem, userEloRating: number, userId: string, userScores: UserScores, finalApproachScore: number, edgeCaseScore: number, numberOfAttempts: number) {

    const userPerformance: number = 0.55 * (finalApproachScore / 100) +
      0.25 * (edgeCaseScore / 100) +
      0.20 * (services.weights.problemDifficultyWeights[problem.difficulty as keyof typeof services.weights.problemDifficultyWeights] / 100)

    console.log("User Performance: ", userPerformance)

    let effectiveUserRating: number = 0.5 * userEloRating

    let totalPrimaryTopicRating: number = 0
    for (const topic of problem.primary_topics) {
      if (userScores?.topic_ratings && Object.hasOwn(userScores?.topic_ratings, topic)) {
        totalPrimaryTopicRating +=
          userScores?.topic_ratings[topic as keyof typeof userScores.topic_ratings]
      }
    }
    const weightedAveragePrimaryTopicRating: number =
      Number.isNaN(totalPrimaryTopicRating / problem.primary_topics.length) ||
        totalPrimaryTopicRating === 0 ?
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


    console.log("Effective User Rating: ", effectiveUserRating)
    const expectedUserPerformance = 1 / (1 + Math.pow(10, (problem.rating - effectiveUserRating) / 400))

    console.log("Expected user performance: ", expectedUserPerformance)

    let numberOfAttemptsModifier = 1
    if (numberOfAttempts >= services.weights.numberOfAttemptsModifier.maxNumber) {
      numberOfAttemptsModifier = services.weights.numberOfAttemptsModifier.maxValue
    }
    else {
      numberOfAttemptsModifier = services.weights.numberOfAttemptsModifier[numberOfAttempts as keyof typeof services.weights.numberOfAttemptsModifier]
    }

    console.log("Attempt based modifier: ", numberOfAttemptsModifier)

    const ratingChange = numberOfAttemptsModifier * services.weights.elo_k_weight * (userPerformance - expectedUserPerformance)
    return ratingChange
  }

  async calculateNewUserScores(userId: string, userScores: UserScores, problemId: string, newApproachScore: number, newEdgeCaseScore: number, problemDifficulty: string) {
    let userSubmissionsData: { approach_score: number, submitted_at: string, difficulty: string, edge_case_score: number, problem_id: string }[] | []

    try {
      userSubmissionsData = await this.submissionDAO.viewScoresByUser(userId)
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

  buildNewLast5Submissions(submissionData: Submission, last5submissions: ShortSubmission[]) {

    let newestToOldest = [...last5submissions].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));

    while (newestToOldest.length > 4) {
      newestToOldest.pop()
    }

    let newShortSubmission = new ShortSubmission()

    newShortSubmission.submission_id = submissionData.id
    newShortSubmission.problem_id = submissionData.problem_id
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
}
