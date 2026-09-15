import { type Problem, type Submission, type UserScores, type User, ShortSubmission } from "../../entities/index.js";
import { InternalServerError, NotFoundError, ValidationError, UnauthorizedError } from "../../errors/index.js";
import type { IJobQueue, IUseCase, IProblemDAO, ISubmissionDAO, IValidatorResult, IValidator, ModelResponse, INotifier, IJobDetails } from "../../interfaces/index.js";
import services from "../../config/services.js";
import type { ServerContext } from "@modelcontextprotocol/server";
import SubmissionDAO from "../../infrastructure/data-access/submissionDAO.js";



export default class SubmitSolution implements IUseCase<{ submission_id: string | undefined }> {
  constructor(
    private problemDAO: IProblemDAO,
    private submissionDAO: ISubmissionDAO,
    private userSolutionValidator: IValidator<string>,
    protected evaluationQueue: IJobQueue<string>,
    private progressNotifier?: INotifier
  ) { }

  async call(userId: string, problemId: string, userInput: string, mcpServerContext?: ServerContext): Promise<{ submission_id: string | undefined }> {

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



    let problemExists: Boolean | null
    try {
      problemExists = await this.problemDAO.checkExistanceById(problemId)
    }
    catch (e) {
      throw new InternalServerError('Error while fetching problem from DB')
    }
    if (!problemExists) {
      throw new NotFoundError('Problem not found in DB')
    }


    if (this.progressNotifier && mcpServerContext) {
      await this.progressNotifier.notify(mcpServerContext, 3, 6, "🟢 Calculating Scores and Metrics")
    }

    let submissionData: Pick<Submission, 'status' | 'timer' | 'problem_id' | 'submitted_at' | 'user_id' | 'user_input' | 'hints_used' | 'id'>
    try {
      submissionData = await this.submissionDAO.createInitial({
        user_id: userId,
        problem_id: problemId,
        user_input: userInput,
        hints_used: [],
        submitted_at: new Date().toISOString(),
        timer: null,
        status: "pending"
      })
    }
    catch (e) {
      throw new InternalServerError('Failed to add submission to database', e)
    }
    if (!submissionData.id) {
      throw new InternalServerError('Failed to add submission to database')
    }


    let jobDetails: IJobDetails<string>
    try {
      jobDetails = await this.evaluationQueue.addJob('submission-evaluation-job', submissionData.id)
    }
    catch (e) {
      throw new InternalServerError("Error when trying to submit job", e)
    }

    return { submission_id: jobDetails.body }
  }
}
