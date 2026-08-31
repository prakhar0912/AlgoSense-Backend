import type { Submission, User, UserScores } from "../entities/index.js";
import { InternalServerError, ValidationError } from "../errors/index.js";
import type { IRequest, IValidator, INotifier } from "../interfaces/index.js";

import type {
  FindUserbyId,
  DeleteUser,
  SubmitSolution,
  UpdateConsistencyScore,
  UpdateUserScore,
  UpdateUserProfile,
  RegisterUser,
  GetSubmissionsById,
} from "../use-cases/user/index.js"


type profileDataTypes = Pick<User, 'first_name' | 'last_name' | 'email_notifications_enabled'>
// Conforming with Zod for type agreement
type OptionalWithUndefined<T> = {
  [K in keyof T]?: T[K] | undefined
}
type UserSettingsValues = OptionalWithUndefined<Partial<Pick<User, | 'first_name' | 'last_name' | 'email_notifications_enabled'>>>



export default class UserController {
  constructor(
    protected findUserbyId: FindUserbyId,
    protected deleteSelf: DeleteUser,
    protected submitSolution: SubmitSolution,
    protected updateConsistencyScore: UpdateConsistencyScore,
    protected updateUserScore: UpdateUserScore,
    protected updateUserSettings: UpdateUserProfile,
    protected createUser: RegisterUser,
    protected getSubmissionsById: GetSubmissionsById,
    // Validators
    protected profileDataValidator: IValidator<UserSettingsValues | null | undefined>,

    protected mcpNotifier?: INotifier
  ) { }


  // private validatePaginationParams(params?: IRequest['params']) {
  //   const page = params?.page;
  //   const perPage = params?.perPage;
  //
  //   if (
  //     (page !== undefined && typeof page !== 'number') ||
  //     (perPage !== undefined && typeof perPage !== 'number')
  //   ) {
  //     throw new ValidationError('Params are required to be numbers');
  //   }
  //
  //   return { page, perPage };
  // }
  //
  //Helper Functions above

  async getUserSubmissions(request: IRequest) {
    if (!request.userId) {
      throw new ValidationError("userId not present")
    }
    return await this.getSubmissionsById.call(request.userId)

  }

  async newUserRegistration(request: IRequest): Promise<User | null> {
    type UserCreationPayload = {
      id: string
      email: string,
      first_name?: string,
      last_name?: string,
      created_at: string,
      email_verified: boolean,
      role: "user" | "admin",
      email_notifications_enabled?: boolean
    }


    if (!request.body || typeof request.body !== "object") {
      throw new ValidationError('Request body is required')
    }
    const body = request.body as UserCreationPayload

    if (!body.id || typeof body.id !== "string") {
      throw new ValidationError('User ID is not valid')
    }

    if (!body.email || typeof body.email !== "string") {
      throw new ValidationError('email should be a string')
    }

    if (body.first_name && typeof body.first_name !== "string") {
      throw new ValidationError('first_name should be a string')
    }

    if (body.last_name && typeof body.last_name !== "string") {
      throw new ValidationError('last_name should be a string')
    }

    if (!body.created_at || typeof body.created_at !== "string") {
      throw new ValidationError('created_at should be a string')
    }

    if (!body.role || typeof body.role !== "string") {
      throw new ValidationError('role should be a string')
    }

    if (typeof body.email_verified !== "boolean") {
      throw new ValidationError('email_verified should be a boolean', [{ field: "email_verified", message: `Recieved: ${body.email_verified}` }])
    }


    if (typeof body.email_notifications_enabled !== "boolean") {
      throw new ValidationError('email_notifications_enabled should be a boolean')
    }

    return await this.createUser.call(request.body as UserCreationPayload)

  }

  async deleteSelfUser(request: IRequest) {
    if (!request.userId) {
      throw new ValidationError("userId not present")
    }
    return await this.deleteSelf.call(request.userId)
  }

  async getProfile(request: IRequest) {
    if (!request.userId) {
      throw new ValidationError("userId not present")
    }
    return await this.findUserbyId.call(request.userId)
  }

  async submitAnswer(request: IRequest): Promise<{ result: Submission, prevScores: UserScores | null | undefined, newScores: UserScores }> {
    //TODO: Reading User unnecessary times, make more efficient.
    if (!request.userId) {
      throw new ValidationError("userId not present")
    }

    if (this.mcpNotifier && request.mcpServerContext) {
      await this.mcpNotifier.notify(request.mcpServerContext, 1, 6, "🟢 Submitting your solution!")
    }

    const user = await this.findUserbyId.call(request.userId)

    if (user.scores === undefined) {
      throw new InternalServerError("User Data malformed, please reach out to an admin")
    }
    if (!request.body || typeof request.body !== "object") {
      throw new ValidationError('Request body is required')
    }
    const body = request.body as { problem_id: string; userInput: string }
    if (!body.problem_id || typeof body.problem_id !== "string") {
      throw new ValidationError('Problem ID is not valid')
    }
    if (!body.userInput || typeof body.userInput !== "string") {
      throw new ValidationError('Answer isn\'t of valid type: string')
    }

    if (this.mcpNotifier && request.mcpServerContext) {
      await this.mcpNotifier.notify(request.mcpServerContext, 2, 6, "🟢 Found your User Profile! Submitting your solution!")
    }
    const result = await this.submitSolution.call(user.id, body.problem_id, body.userInput, request.mcpServerContext)
    if (!result) {
      throw new InternalServerError("Didn't get good response from solution submitter")
    }
    if (typeof result.approach_score !== "number" || typeof result.edge_case_score !== "number") {
      throw new InternalServerError("Recieved malformed data from model response")
    }

    if (this.mcpNotifier && request.mcpServerContext) {
      await this.mcpNotifier.notify(request.mcpServerContext, 5, 6, "🟢 Evaluvated your Solution! Getting your new Scores!")
    }
    const newUser = await this.findUserbyId.call(user.id)

    if (this.mcpNotifier && request.mcpServerContext) {
      await this.mcpNotifier.notify(request.mcpServerContext, 5, 6, "🟢 Got your fresh scores!")
    }
    if (!newUser || !newUser.scores) {
      throw new InternalServerError("Didn't get good response from solution submitter")
    }
    return {
      result,
      prevScores: user.scores,
      newScores: newUser.scores
    }
  }

  async updateConsistencyScores(request: IRequest) {
    if (!request.userId) {
      throw new ValidationError("userId not present")
    }

    return await this.updateConsistencyScore.call(request.userId)
  }

  async updateSelfProfile(request: IRequest) {
    if (!request.userId) {
      throw new ValidationError("userId not present")
    }


    let validationResult
    try {
      validationResult = this.profileDataValidator.validate(request.body as profileDataTypes)
    } catch (e) {
      throw new InternalServerError('User Input Validation Function Failed', e)
    }
    if (!validationResult.success || !validationResult.data || validationResult.errors) {
      throw new ValidationError('Invalid user profile data', validationResult.errors)
    }

    return await this.updateUserSettings.call(request.userId, validationResult.data as profileDataTypes)
  }

}
