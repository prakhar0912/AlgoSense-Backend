import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type AuthUser from "../../entities/authUser.js";
import { ValidationError } from "../../errors/index.js";
import type IValidator from "../../interfaces/validator.js";
import type ILoginResponse from "../../interfaces/user/loginResponse.js";
import InternalServerError from "../../errors/internalServerError.js";

export default class RegisterUser implements IUseCase<ILoginResponse> {
    constructor(
        private userDAO: IUserDAO,
        private validateUserRegistration: IValidator<AuthUser>,
        private hashPassword: (password: string) => Promise<{ salt: string; hashedPassword: string }>,
        private generateToken: (userId: string) => string
    ) { }
    async call(payload: Pick<AuthUser, "email" | "password" | "first_name" | "last_name" | "email_notifications_enabled">): Promise<ILoginResponse> {
        const validationResult = this.validateUserRegistration.validate(payload)
        if (!validationResult.success || !validationResult.data) {
            throw new ValidationError('Invalid user registration data', validationResult.errors)
        }
        const { email, password, first_name, last_name, email_notifications_enabled } = payload
        const existingUser = await this.userDAO.findByEmail(email)
        if (existingUser) {
            throw new ValidationError('Email is already in use', [{ path: ['email'], message: 'Email is already in use' }])
        }
        const { salt, hashedPassword } = await this.hashPassword(password)
        try {
            const newUser = await this.userDAO.create({
                email,
                first_name,
                last_name,
                email_notifications_enabled,
                password: hashedPassword,
                salt,
                role: 'user',
                banned: false,
                created_at: new Date(),
                email_verified: false,
            })
            const token = this.generateToken(newUser.id)
            return {
                token,
                user: newUser
            }
        }
        catch (e) {
            throw new InternalServerError('Error in creating user or token!')
        }
    }
}