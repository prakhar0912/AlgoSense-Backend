import type Submission from "../entities/submission.js";
import type User from "../entities/user.js";
import type UserScores from "../entities/userScores.js";
import InternalServerError from "../errors/internalServerError.js";
import ValidationError from "../errors/validationError.js";
import type IRequest from "../interfaces/request.js";
import type IValidator from "../interfaces/validator.js";
type profileDataTypes = Pick<User, 'first_name' | 'last_name' | 'email_notifications_enabled'>


import type FindUserbyId from "../use-cases/user/findUser.js";
import type DeleteUser from "../use-cases/user/deleteUser.js";
import type SubmitSolution from "../use-cases/user/submitSolution.js";
import type UpdateConsistencyScore from "../use-cases/user/updateConsistencyScore.js";
import type UpdateUserScore from "../use-cases/user/updateUserScore.js";
import type UpdateUserProfile from "../use-cases/user/updateUserSettings.js";
import type RegisterUser from "../use-cases/user/register.js";
import type GetSubmissionsById from "../use-cases/user/getSubmissionsById.js";

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

  ) { }


  private validatePaginationParams(params?: IRequest['params']) {
    const page = params?.page;
    const perPage = params?.perPage;

    if (
      (page !== undefined && typeof page !== 'number') ||
      (perPage !== undefined && typeof perPage !== 'number')
    ) {
      throw new ValidationError('Params are required to be numbers');
    }

    return { page, perPage };
  }

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

    if (!body.email_verified || typeof body.email_verified !== "boolean") {
      throw new ValidationError('email_verified should be a boolean')
    }


    if (body.email_notifications_enabled && typeof body.email_notifications_enabled !== "boolean") {
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
    if (!request.userId) {
      throw new ValidationError("userId not present")
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


    const result = await this.submitSolution.call(user.id, user.scores, user.last_5_submissions, body.problem_id, body.userInput)
    if (!result) {
      throw new InternalServerError("Didn't get good response from solution submitter")
    }
    if (typeof result.approach_score !== "number" || typeof result.edge_case_score !== "number") {
      throw new InternalServerError("Recieved malformed data from model response")
    }
    const newUser = await this.findUserbyId.call(user.id)
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

    const user = await this.findUserbyId.call(request.userId)
    return await this.updateConsistencyScore.call(user.id, user.scores)
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
