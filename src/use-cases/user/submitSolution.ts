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
    console.log(modelResp)

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
    if (!Object.hasOwn(data, 'user_explanation_identified_apporach') ||
      !Object.hasOwn(data, 'user_explanation_rating') ||
      !Object.hasOwn(data, 'user_explanation_pass') ||
      !Object.hasOwn(data, 'missing_points_in_user_explanation') ||
      !Object.hasOwn(data, 'edge_cases_missed_in_user_explanation')
    ) {
      throw new InternalServerError('The model responded incorrectly.', errors)
    }

    let validatedData: ModelResponse = data


    let edgeCases: { approach: string, description: string, importance: "critical" | "high" | "medium" | "low" }[] = []

    problem.approaches.forEach((approach) => {
      if (typeof approach.edge_cases !== "undefined" &&
        approach.edge_cases.length >= 1 &&
        ((Object.hasOwn(approach, 'primary_technique') && approach.primary_technique === validatedData.user_explanation_identified_apporach) ||
          (approach.type === validatedData.user_explanation_identified_apporach))
      ) {
        approach.edge_cases.forEach((c) => {
          edgeCases.push({
            approach: approach.primary_technique ? approach.primary_technique : approach.type,
            description: c.case,
            importance: c.importance,
          })
        });
      }
    })

    let coveredEdgeCases: string[] = []
    let finalEdgeCaseData: Submission['edge_cases'] | [] = []
    let earned = 0
    let max = 0


    //TODO: What to do when edgecases generated are of a different approach
    for (const detectedEdgeCase of validatedData.edge_cases_missed_in_user_explanation) {
      if (coveredEdgeCases.includes(detectedEdgeCase.missed_edge_case_description)) {
        continue
      }
      for (const edgeCase of edgeCases) {
        if (detectedEdgeCase.missed_edge_case_description == edgeCase.description
          && !coveredEdgeCases.includes(detectedEdgeCase.missed_edge_case_description)) {

          let caseEarned = services.weights.edgeCaseImportanceWeights[edgeCase.importance as keyof typeof services.weights.edgeCaseImportanceWeights] * services.weights.edgeCaseCoverageWeights[detectedEdgeCase.edge_case_coverage as keyof typeof services.weights.edgeCaseCoverageWeights]
          let caseMax = services.weights.edgeCaseImportanceWeights[edgeCase.importance as keyof typeof services.weights.edgeCaseImportanceWeights];
          //FIX: Why do I have to use never here
          let edgeCaseData = {
            coverage: detectedEdgeCase.edge_case_coverage,
            importance: edgeCase.importance,
            description: edgeCase.description
          }
          finalEdgeCaseData.push(edgeCaseData as never)

          earned += caseEarned
          max += caseMax
        }
      }
      coveredEdgeCases.push(detectedEdgeCase.missed_edge_case_description)

    }
    let edgeCaseScore = 100
    console.log(earned, max)
    if (max !== 0 && !Number.isNaN(earned) && !Number.isNaN(max)) {
      edgeCaseScore = Math.ceil((earned / max) * 100)
    }

    let submissionData: Submission
    try {
      submissionData = await this.submissionDAO.create({
        user_id: userId,
        problem_id: problemId,
        user_input: userInput,
        difficulty: problem.difficulty,
        problem_rating: problem.rating,
        approach_score: services.weights.approachScoreWeights[data['user_explanation_rating'] as keyof typeof services.weights.approachScoreWeights],
        identified_approach: data.user_explanation_identified_apporach,
        pass: data.user_explanation_pass,
        missing_points: data.missing_points_in_user_explanation,
        edge_cases: finalEdgeCaseData,
        edge_case_score: edgeCaseScore,
        submitted_at: new Date().toISOString()
      })
    }
    catch (e) {
      throw new InternalServerError('Failed to add submission to database', e)
    }


    let userSubmissionsData: { approach_score: number, submitted_at: string, difficulty: string, edge_case_score: number, problem_id: string }[] | []

    try {
      userSubmissionsData = await this.submissionDAO.viewScoresByUser(userId)
    }
    catch (e) {
      throw new InternalServerError('Failed to fetch user submissions from the database', e)
    }
    console.log(userSubmissionsData)

    let weightedScore = 0;
    let totalWeight = 0;
    let weightedEdgeScore = 0

    for (const submission of userSubmissionsData) {
      const weight = services.weights.problemDifficultyWeights[submission.difficulty as keyof typeof services.weights.problemDifficultyWeights];

      weightedEdgeScore += submission.edge_case_score * weight
      weightedScore += submission.approach_score * weight;
      totalWeight += weight;
    }

    let mergedApproachScore = Number.isNaN(weightedScore / totalWeight) ? 0 : Math.round(weightedScore / totalWeight);
    let mergedEdgeCaseScore = Number.isNaN(weightedEdgeScore / totalWeight) ? 0 : Math.round(weightedEdgeScore / totalWeight);

    let totalScore = services.weights.totalScoreWeights.approach_score * mergedApproachScore
      + services.weights.totalScoreWeights.edge_case_score * mergedEdgeCaseScore



    if (userScores !== undefined && userScores !== null && Number.isFinite(userScores.consistency_score)) {
      totalScore += services.weights.totalScoreWeights.consistency_score * userScores?.consistency_score
    }

    console.log(mergedEdgeCaseScore, mergedApproachScore, totalScore)

    const userPerformance: number = 0.55 * (submissionData.approach_score / 100) +
      0.25 * (submissionData.edge_case_score / 100) +
      0.20 * (services.weights.problemDifficultyWeights[submissionData.difficulty as keyof typeof services.weights.problemDifficultyWeights] / 100)


    if (!userScores?.elo_rating) {
      throw new InternalServerError("User's ELO rating is: null or undefined")
    }

    let effectiveUserRating: number = 0.5 * userScores?.elo_rating

    let totalPrimaryTopicRating: number = 0
    for (const topic of problem.primary_topics) {
      if (Object.hasOwn(userScores?.topic_ratings, topic)) {
        totalPrimaryTopicRating +=
          userScores?.topic_ratings[topic as keyof typeof userScores.topic_ratings]
      }
    }
    const weightedAveragePrimaryTopicRating: number =
      Number.isNaN(totalPrimaryTopicRating / problem.primary_topics.length) ||
        totalPrimaryTopicRating === 0 ?
        0.3 * userScores?.elo_rating : 0.3 * (totalPrimaryTopicRating / problem.primary_topics.length)

    let totalSecondaryTopicRating: number = 0
    for (const topic of problem.secondary_topics) {
      if (Object.hasOwn(userScores?.topic_ratings, topic)) {
        totalSecondaryTopicRating +=
          userScores?.topic_ratings[topic as keyof typeof userScores.topic_ratings]
      }
    }
    const weightedAverageSecondaryTopicRating: number =
      Number.isNaN(totalSecondaryTopicRating / problem.secondary_topics.length) ||
        totalSecondaryTopicRating === 0 ?
        0.2 * userScores?.elo_rating : 0.2 * (totalSecondaryTopicRating / problem.secondary_topics.length)

    effectiveUserRating += weightedAveragePrimaryTopicRating + weightedAverageSecondaryTopicRating

    effectiveUserRating = Math.floor(effectiveUserRating)

    const expectedUserPerformance = 1 / (1 + Math.pow(10, (problem.rating - effectiveUserRating) / 400))

    const ratingChange = services.weights.elo_k_weight * (userPerformance - expectedUserPerformance)

    if (Number.isNaN(ratingChange)) {
      throw new InternalServerError('Rating Change value is not a number')
    }


    let topicRatingsChange: Record<string, number> = {}
    for (const topic of problem.primary_topics) {
      if (Object.hasOwn(userScores?.topic_ratings, topic)) {
        topicRatingsChange[topic as keyof typeof userScores.topic_ratings] = userScores?.topic_ratings[topic as keyof typeof userScores.topic_ratings] === 0 ?
          userScores.elo_rating + ratingChange :
          userScores?.topic_ratings[topic as keyof typeof userScores.topic_ratings] + ratingChange
      }
    }
    for (const topic of problem.secondary_topics) {
      if (Object.hasOwn(userScores?.topic_ratings, topic)) {
        topicRatingsChange[topic as keyof typeof userScores.topic_ratings] = userScores?.topic_ratings[topic as keyof typeof userScores.topic_ratings] === 0 ?
          userScores.elo_rating + 0.5 * ratingChange :
          userScores?.topic_ratings[topic as keyof typeof userScores.topic_ratings] + 0.5 * ratingChange
      }
    }

    let updatedUserScores: UserScores
    try {
      updatedUserScores = await this.userDAO.setUserScores(userId, {
        approaches_score: mergedApproachScore,
        edge_case_score: mergedEdgeCaseScore,
        total_score: totalScore,
        elo_rating: userScores.elo_rating + ratingChange,
        topic_ratings: topicRatingsChange
      })
    }
    catch (e) {
      throw new InternalServerError('Unable to store new Scores.')
    }


    last5submissions = last5submissions && Array.isArray(last5submissions) ? last5submissions : []
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

    let updatedShortSubmissions: ShortSubmission[]
    try {
      updatedShortSubmissions = await this.userDAO.setSubmissionsInProfile(userId, newestToOldest)
    }
    catch (e) {
      throw new InternalServerError('Unable to store new Submission Data to Database.')
    }



    return submissionData
  }
}
