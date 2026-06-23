import type AuthUser from "../entities/authUser.js";
import type User from "../entities/user.js"
import { ValidationError, InternalServerError } from "../errors/index.js";
import type IRequest from "../interfaces/request.js";
import type IUseCase from "../interfaces/useCase.js";
import type ILoginResponse from "../interfaces/user/loginResponse.js";
import type IValidator from "../interfaces/validator.js";

type RegistrationDataTypes = Pick<AuthUser, 'email' | 'password' | 'first_name' | 'last_name' | 'email_notifications_enabled' | 'retypedPassword'>
export default class AuthController {
    constructor(
        protected loginUser: IUseCase<ILoginResponse>,
        protected registerUser: IUseCase<ILoginResponse>,

        //Validators
        protected registrationDataValidator: IValidator<RegistrationDataTypes>,
        protected loginDataValidator: IValidator<{ email: string, password: string }>,
    ) { }

    async login(request: IRequest): Promise<ILoginResponse> {
        let validationResult
        try {
            validationResult = this.loginDataValidator.validate(request.body as { email: string, password: string })
        } catch (e) {
            throw new InternalServerError('User Input Validation Function Failed')
        }
        if (!validationResult.success || !validationResult.data || validationResult.errors) {
            throw new ValidationError('Invalid user login data', validationResult.errors)
        }

        let { email, password } = validationResult.data

        let loggedInUser: ILoginResponse
        try {
            loggedInUser = await this.loginUser.call(email, password)
        } catch (e) {
            throw e
        }
        return loggedInUser
    }

    async register(request: IRequest): Promise<ILoginResponse> {
        let validationResult
        try {
            validationResult = this.registrationDataValidator.validate(request.body as RegistrationDataTypes)
        } catch (e) {
            throw new InternalServerError('User Input Validation Function Failed')
        }
        if (!validationResult.success || !validationResult.data || validationResult.errors) {
            throw new ValidationError('Invalid user registration data', validationResult.errors)
        }

        let loggedInUser: ILoginResponse
        try {
            loggedInUser = await this.registerUser.call(validationResult.data)
        } catch (e) {
            throw e
        }
        return loggedInUser
    }
}