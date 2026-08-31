import type { User } from "../../entities/index.js";
import { InternalServerError, ValidationError } from "../../errors/index.js";
import type { IUseCase, IUserDAO, IValidator } from "../../interfaces/index.js";


type OptionalWithUndefined<T> = {
  [K in keyof T]?: T[K] | undefined
}
type UserSettingsValues = OptionalWithUndefined<Partial<Pick<User, | 'first_name' | 'last_name' | 'email_notifications_enabled'>>>

export default class UpdateUserProfile implements IUseCase<User> {
  constructor(
    private userDAO: IUserDAO,
    private validateUserProfile: IValidator<UserSettingsValues | null | undefined>
  ) { }
  async call(userId: string, updatedValues: UserSettingsValues) {
    let validationResult
    try {
      validationResult = this.validateUserProfile.validate(updatedValues)
    } catch (e) {
      throw new InternalServerError('User Input Validation Function Failed', e)
    }
    if (!validationResult.success || !validationResult.data || validationResult.errors) {
      throw new ValidationError('Invalid user profile data', validationResult.errors)
    }

    let updatedUserProfile: User
    try {
      updatedUserProfile = await this.userDAO.update(userId, validationResult.data as Partial<Pick<User, | 'first_name' | 'last_name' | 'email_notifications_enabled'>>)
    }
    catch (e) {
      throw new InternalServerError('Unable to update user profile', e)
    }
    return updatedUserProfile
  }
}
