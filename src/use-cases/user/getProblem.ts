import type Problem from "../../entities/problem.js";
import { ValidationError } from "../../errors/index.js";
import NotFoundError from "../../errors/notFoundError.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";

export default class GetProblem implements IUseCase<Problem> {
    constructor(
        private problemDAO: IProblemDAO
    ) { }
    async call(problemId: string): Promise<Problem> {
        if (!problemId) {
            throw new ValidationError('Problem ID value not provided')
        }
        const problem = await this.problemDAO.findById(problemId)
        if (!problem) {
            throw new NotFoundError('Problem not found in DB')
        }
        return problem
    }
}