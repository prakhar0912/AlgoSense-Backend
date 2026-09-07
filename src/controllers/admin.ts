import type { ShortSubmission, User, UserScores } from "../entities/index.js";
import { InternalServerError, ValidationError } from "../errors/index.js";
import type { IPaginated, IRequest, IUseCase, IValidator } from "../interfaces/index.js";



// Conforming with Zod for type agreement
type OptionalWithUndefined<T> = {
  [K in keyof T]?: T[K] | undefined
}
type FilterUserPayload =
  Omit<Partial<User>, "scores" |
    "last_5_submissions"> & {
      scores?: OptionalWithUndefined<Partial<UserScores>> | null;
      last_5_submissions?:
      OptionalWithUndefined<Partial<ShortSubmission>>[] | null;
    };

type UpdateUserPayload =
  Omit<Partial<User>, 'id' | 'created_at' | "scores" |
    "last_5_submissions"> & {
      scores?: OptionalWithUndefined<Partial<UserScores>> | null;
      last_5_submissions?:
      OptionalWithUndefined<Partial<ShortSubmission>>[] | null;
    };



export default class AdminController {
  constructor(
    protected listUsers: IUseCase<IPaginated<User>>,
    protected removeUser: IUseCase<boolean>,
    protected toggleBanUser: IUseCase<User>,
    protected updateUser: IUseCase<User>,

    protected userFiltersDataTypeValidator: IValidator<OptionalWithUndefined<FilterUserPayload> | null | undefined>,
    protected updateUserDataTypeValidator: IValidator<OptionalWithUndefined<UpdateUserPayload> | null | undefined>

  ) { }


  private validatePaginationParams(params?: IRequest['params']): { page: number | undefined, perPage: number | undefined } {
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

  //Helper Functions Above


  async listFilteredUsers(request: IRequest): Promise<IPaginated<User>> {

    const { page, perPage } = this.validatePaginationParams(request.params)

    let validationResult
    try {
      validationResult = this.userFiltersDataTypeValidator.validate(request.body as Partial<User>)
    } catch (e) {
      throw new InternalServerError('User Filter Data Validation Function Failed', e)
    }
    if (!validationResult.success || validationResult.errors) {
      throw new ValidationError('Invalid User Filter Data', validationResult.errors)
    }

    const filteredUsers = await this.listUsers.call(validationResult.data, page, perPage)
    return filteredUsers
  }

  async deleteUser(request: IRequest): Promise<boolean> {
    let userId = request.params?.id
    if (!userId || typeof userId !== "string") {
      throw new ValidationError('User Id is required')
    }
    const deletedUser = await this.removeUser.call(userId)
    return deletedUser

  }

  async toggleBanOnUser(request: IRequest): Promise<User> {
    const requestBody = request.body as { id?: string; isBanned?: boolean }
    if (!requestBody || typeof requestBody !== "object") {
      throw new ValidationError('Body is required')
    }
    const userId = requestBody.id
    const isBanned = requestBody.isBanned
    if (typeof userId !== "string") {
      throw new ValidationError('User Id is required')
    }
    if (typeof isBanned !== "boolean") {
      throw new ValidationError('isBanned is required')
    }
    const alteredUser = await this.toggleBanUser.call({ id: userId, isBanned })
    return alteredUser
  }

  async updateUserById(request: IRequest): Promise<User> {

    let validationResult
    try {
      validationResult = this.updateUserDataTypeValidator.validate(request.body as Partial<User>)
    } catch (e) {
      throw new InternalServerError('Problem Data Validation Function Failed', e)
    }
    if (!validationResult.success || !validationResult.data || validationResult.errors) {
      throw new ValidationError('Invalid User Data Controller', validationResult.errors)
    }

    const userId = request.params?.id
    if (!userId || typeof userId !== "string") {
      throw new ValidationError('Problem ID is required')
    }

    const updatedUser = await this.updateUser.call(userId, validationResult.data)
    return updatedUser

  }
}
