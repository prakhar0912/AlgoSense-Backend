import type User from "../../entities/user.js";
import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type IValidator from "../../interfaces/validator.js";

type UserSettingsValues = Partial<Pick<User, | 'first_name' | 'last_name'  | 'email_notifications_enabled'>>

export default class UpdateUserProfile implements IUseCase<User> {
    constructor(
        private userDAO: IUserDAO,
        private validateUserProfile: IValidator<UserSettingsValues>
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
        try{
            updatedUserProfile = await this.userDAO.update(userId, validationResult.data)
        }
        catch(e){
            throw new InternalServerError('Unable to update user profile', e)
        } 
        return updatedUserProfile
    }
}