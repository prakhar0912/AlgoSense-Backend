import type Problem from "../../entities/problem.js";
import { ValidationError } from "../../errors/index.js";
import InternalServerError from "../../errors/internalServerError.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import type { IValidatorResult } from "../../interfaces/validator.js";
import type IValidator from "../../interfaces/validator.js";

export default class UpdateProblem implements IUseCase<Problem> {
    constructor(
        private problemDAO: IProblemDAO,
        private problemValidator: IValidator<Problem>
    ) { }
    async call(problemId: string, payload: Partial<Problem>): Promise<Problem> {
        let validatedProblem: IValidatorResult<Problem>

        try{
            validatedProblem = this.problemValidator.validate(payload)
        }
        catch(e){
            throw new InternalServerError('Problem validator function failed', e)
        }
        if (!validatedProblem.success || !validatedProblem.data || validatedProblem.errors) {
            throw new ValidationError('Problem Data Invalid.', validatedProblem.errors)
        }

        let updatedProblem: Problem
        try {
            updatedProblem = await this.problemDAO.update(problemId, validatedProblem.data)
        }
        catch (e) {
            throw new InternalServerError('Unable to update the problem to the DB', e)
        }
        return updatedProblem
    }
}