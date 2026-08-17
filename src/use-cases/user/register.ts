import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import { ValidationError } from "../../errors/index.js";
import type IValidator from "../../interfaces/validator.js";
import InternalServerError from "../../errors/internalServerError.js";
import type User from "../../entities/user.js";


type UserCreationPayload = {
  id: string
  email: string,
  first_name?: string | undefined,
  last_name?: string | undefined,
  created_at: string,
  role: "admin" | "user",
  email_verified: boolean,
  email_notifications_enabled?: boolean | undefined
}

export default class RegisterUser implements IUseCase<User> {
  constructor(
    private userDAO: IUserDAO,
    private validateUserRegistration: IValidator<UserCreationPayload>,
  ) { }
  async call(payload: UserCreationPayload): Promise<User> {
    let validationResult
    try {
      validationResult = this.validateUserRegistration.validate(payload)
    } catch (e) {
      throw new InternalServerError('User Input Validation Function Failed')
    }
    if (!validationResult.success || !validationResult.data) {
      throw new ValidationError('Invalid user registration data', validationResult.errors)
    }




    const { id, email, first_name, last_name, role, created_at, email_verified, email_notifications_enabled } = validationResult.data


    let newUser: User
    try {
      newUser = await this.userDAO.create({
        id,
        email,
        first_name: first_name ? first_name : "Johney",
        last_name: last_name ? last_name : "",
        email_notifications_enabled: email_notifications_enabled ? email_notifications_enabled : true,
        role,
        banned: false,
        created_at,
        email_verified,
      })
    }
    catch (e) {
      throw new InternalServerError('Error in creating user', e)
    }

    return newUser
  }
}
