import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type AuthUser from "../../entities/authUser.js";
import { ValidationError } from "../../errors/index.js";
import type IValidator from "../../interfaces/validator.js";
import type ILoginResponse from "../../interfaces/user/loginResponse.js";
import InternalServerError from "../../errors/internalServerError.js";
import type User from "../../entities/user.js";

export default class RegisterUser implements IUseCase<ILoginResponse> {
    constructor(
        private userDAO: IUserDAO,
        private validateUserRegistration: IValidator<AuthUser>,
        private hashPassword: (password: string) => Promise<{ salt: string; hashedPassword: string }>,
        private generateToken: (userId: string) => string
    ) { }
    async call(payload: Pick<AuthUser, "email" | "password" | "first_name" | "last_name" | "email_notifications_enabled">): Promise<ILoginResponse> {
        let validationResult
        try {
            validationResult = this.validateUserRegistration.validate(payload)
        } catch (e) {
            throw new InternalServerError('User Input Validation Function Failed')
        }
        if (!validationResult.success || !validationResult.data) {
            throw new ValidationError('Invalid user registration data', validationResult.errors)
        }




        const { email, password, first_name, last_name, email_notifications_enabled } = validationResult.data
        let existingUser: User | null
        try {
            existingUser = await this.userDAO.findByEmail(email)
        }
        catch (e) {
            throw new InternalServerError('Failed to check if user already exists')
        }
        if (existingUser) {
            throw new ValidationError('Email is already in use', [{ path: ['email'], message: 'Email is already in use' }])
        }



        let hashedPasswordObj: { hashedPassword: string, salt: string }
        try {
            hashedPasswordObj = await this.hashPassword(password)
        }
        catch (e) {
            throw new InternalServerError('Failed to hash password')
        }

        let newUser: User
        try {
            newUser = await this.userDAO.create({
                email,
                first_name,
                last_name,
                email_notifications_enabled,
                password: hashedPasswordObj.hashedPassword,
                salt: hashedPasswordObj.salt,
                role: 'user',
                banned: false,
                created_at: new Date(),
                email_verified: false,
            })
        }
        catch (e) {
            throw new InternalServerError('Error in creating user')
        }



        let token: string
        try {
            token = this.generateToken(newUser.id)
        }
        catch (e) {
            throw new InternalServerError('Error in generating token')
        }



        return {
            user: newUser,
            token
        }
    }
}