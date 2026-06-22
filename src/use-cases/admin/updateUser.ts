import type User from "../../entities/user.js";
import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type { IValidatorResult } from "../../interfaces/validator.js";
import type IValidator from "../../interfaces/validator.js";

export default class UpdateUser implements IUseCase<User> {
    constructor(
        private userDAO: IUserDAO,
        private userValidator: IValidator<User>
    ) { }
    async call(userId: string, payload: Partial<User>): Promise<User> {

        let validatedUpdatedUser: IValidatorResult<User>
        try{
            validatedUpdatedUser = this.userValidator.validate(payload)            
        }
        catch(e){
            throw new InternalServerError('User data validator function failed', e)
        }
        if (!validatedUpdatedUser.success || !validatedUpdatedUser.data || validatedUpdatedUser.errors) {
            throw new ValidationError('Problem Data Invalid.', validatedUpdatedUser.errors)
        }

        let updatedUser: User
        try {
            updatedUser = await this.userDAO.update(userId, validatedUpdatedUser.data)
        }
        catch (e) {
            throw new InternalServerError('Unable to update the problem to the DB', e)
        }
        return updatedUser
    }
}