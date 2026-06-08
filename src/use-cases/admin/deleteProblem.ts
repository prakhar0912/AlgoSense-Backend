import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";

export default class DeleteProblem implements IUseCase<boolean> {
    constructor(
        private problemDAO: IProblemDAO
    ) { }
    async call(problemId: string): Promise<boolean> {
        if (!problemId) {
            throw new ValidationError('Problem Id not provided')
        }

        let success: boolean
        try {
            success = await this.problemDAO.delete(problemId)
        }
        catch (e) {
            throw new InternalServerError('Unable to delete the problem in the DB')
        }

        return success
    }
}