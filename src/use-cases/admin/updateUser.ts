import type { ShortSubmission, User, UserScores } from "../../entities/index.js";
import { InternalServerError, ValidationError } from "../../errors/index.js";
import type { IUseCase, IUserDAO, IValidator } from "../../interfaces/index.js";



type OptionalWithUndefined<T> = {
  [K in keyof T]?: T[K] | undefined
}
type UpdateUserPayload =
  OptionalWithUndefined<
    Omit<Partial<User>, 'id' | 'created_at' | "scores" |
      "last_5_submissions"> & {
        scores?: OptionalWithUndefined<Partial<UserScores>> | null;
        last_5_submissions?:
        OptionalWithUndefined<Partial<ShortSubmission>>[] | null;
      }>;



export default class UpdateUser implements IUseCase<User> {
  constructor(
    private userDAO: IUserDAO,
    private userValidator: IValidator<UpdateUserPayload | undefined | null>
  ) { }
  async call(userId: string, payload: Partial<User>): Promise<User> {

    let validatedUpdatedUser
    try {
      validatedUpdatedUser = this.userValidator.validate(payload)
    }
    catch (e) {
      throw new InternalServerError('User data validator function failed', e)
    }
    if (!validatedUpdatedUser.success || !validatedUpdatedUser.data || validatedUpdatedUser.errors) {
      throw new ValidationError('Problem Data Invalid.', validatedUpdatedUser.errors)
    }

    let updatedUser: User
    try {
      updatedUser = await this.userDAO.updateSelfProfile(userId, validatedUpdatedUser.data as Partial<User>)
    }
    catch (e) {
      throw new InternalServerError('Unable to update the problem to the DB', e)
    }
    return updatedUser
  }
}
