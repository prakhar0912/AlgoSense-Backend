import type Problem from "../../entities/problem.js";
import { ValidationError } from "../../errors/index.js";
import InternalServerError from "../../errors/internalServerError.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IValidator from "../../interfaces/validator.js";

export default class CreateProblem implements IUseCase<Problem> {
    constructor(
        private problemDAO: IProblemDAO,
        private problemValidator: IValidator<Problem>
    ) { }
    async call(payload: Partial<Problem>): Promise<Problem> {
        const validatedProblem = this.problemValidator.validate(payload)
        if (!validatedProblem.success || !validatedProblem.data) {
            throw new ValidationError('Problem Data Invalid.', validatedProblem.errors)
        }
        try{
            return await this.problemDAO.create(validatedProblem.data)
        }
        catch(e){
            throw new InternalServerError('Unable to save problem to the DB')
        }
    }
}