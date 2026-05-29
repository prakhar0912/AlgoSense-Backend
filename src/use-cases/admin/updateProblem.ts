import type Problem from "../../entities/problem.js";
import { ValidationError } from "../../errors/index.js";
import InternalServerError from "../../errors/internalServerError.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IValidator from "../../interfaces/validator.js";

export default class UpdateProblem implements IUseCase<Problem> {
    constructor(
        private problemDAO: IProblemDAO,
        private problemValidator: IValidator<Problem>
    ) { }
    async call(problemId: string, payload: Partial<Problem>): Promise<Problem> {
        if (!problemId) {
            throw new ValidationError('Problem ID value not provided')
        }
        const validatedProblem = this.problemValidator.validate(payload)
        if (!validatedProblem.success || !validatedProblem.data) {
            throw new ValidationError('Problem Data Invalid.', validatedProblem.errors)
        }
        try {
            return await this.problemDAO.update(problemId, validatedProblem.data)
        }
        catch (e) {
            throw new InternalServerError('Unable to update the problem to the DB')
        }
    }
}