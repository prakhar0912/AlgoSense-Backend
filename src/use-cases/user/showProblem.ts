import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import Problem from "../../entities/problem.js";
import NotFoundError from "../../errors/notFoundError.js";

export default class ShowProblem implements IUseCase<Problem> {
    constructor(
        private problemDAO: IProblemDAO,
    ) { }
    async call(problemId: string): Promise<Problem> {
        let problem = await this.problemDAO.findById(problemId)
        if (!problem) {
            throw new NotFoundError('Problem was not found')
        }
        return problem
    }
}