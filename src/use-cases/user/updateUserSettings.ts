import type User from "../../entities/user.js";
import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type IValidator from "../../interfaces/validator.js";

export default class UpdateUserProfile implements IUseCase<Partial<User>> {
    constructor(
        private userDAO: IUserDAO,
        private validateUserProfile: IValidator<Pick<User, 'email' | 'first_name' | 'last_name' | 'email_verified' | 'email_notifications_enabled'>>
    ) { }
    async call(userId: string, updatedValues: Pick<User, 'email' | 'first_name' | 'last_name' | 'email_verified' | 'email_notifications_enabled'>) {
        let validationResult
        try {
            validationResult = this.validateUserProfile.validate(updatedValues)
        } catch (e) {
            throw new InternalServerError('User Input Validation Function Failed')
        }
        if (!validationResult.success || !validationResult.data) {
            throw new ValidationError('Invalid user registration data', validationResult.errors)
        }

        let updatedUserProfile: User
        try{
            updatedUserProfile = await this.userDAO.update(userId, updatedValues)
        }
        catch(e){
            throw new InternalServerError('Unable to update user profile')
        } 
        return updatedUserProfile
    }
}