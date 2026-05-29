import type User from "../../entities/user.js";
import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type IValidator from "../../interfaces/validator.js";

export default class UpdateUser implements IUseCase<User> {
    constructor(
        private userDAO: IUserDAO,
        private userValidator: IValidator<User>
    ) { }
    async call(userId: string, payload: Partial<User>): Promise<User> {
        const validatedProblem = this.userValidator.validate(payload)
        if (!validatedProblem.success || !validatedProblem.data) {
            throw new ValidationError('Problem Data Invalid.', validatedProblem.errors)
        }
        try {
            return await this.userDAO.update(userId, validatedProblem.data)
        }
        catch (e) {
            throw new InternalServerError('Unable to update the problem to the DB')
        }
    }
}