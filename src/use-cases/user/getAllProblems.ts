import type Problem from "../../entities/problem.js";
import InternalServerError from "../../errors/internalServerError.js";
import type IPaginated from "../../interfaces/paginated.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";

export default class getAllProblems implements IUseCase<IPaginated<Problem>> {
    constructor(
        private problemDAO: IProblemDAO
    ) { }
    async call(page: number = 1, perPage: number = 10): Promise<IPaginated<Problem>> {
        let paginatedProblems: IPaginated<Problem>
        try {
            paginatedProblems = await this.problemDAO.list({}, page, perPage)
        }
        catch (e) {
            throw new InternalServerError('Error while fetching problems from DB')
        }
        return paginatedProblems
    }
}