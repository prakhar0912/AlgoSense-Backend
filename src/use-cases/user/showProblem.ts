import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import Problem from "../../entities/problem.js";
import NotFoundError from "../../errors/notFoundError.js";
import ValidationError from "../../errors/validationError.js";
import InternalServerError from "../../errors/internalServerError.js";

export default class ShowProblem implements IUseCase<Problem> {
    constructor(
        private problemDAO: IProblemDAO,
    ) { }
    async call(problemId: string): Promise<Problem> {
        if (!problemId) {
            throw new ValidationError('Problem ID value not provided')
        }
        
        let problem: Problem | null | undefined
        try {
            problem = await this.problemDAO.findById(problemId)
        } catch (e) {
            throw new InternalServerError('Error while fetching problem from DB')
        }

        if (!problem) {
            throw new NotFoundError('Problem was not found')
        }
        return problem
    }
}