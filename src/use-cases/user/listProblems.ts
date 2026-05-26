import type Problem from "../../entities/problem.js";
import type IPaginated from "../../interfaces/paginated.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";




export default class ListProblems implements IUseCase<IPaginated<Problem>> {
    constructor(
        private problemDAO: IProblemDAO,
    ) { }
    async call(page: number = 1, perPage: number = 10): Promise<IPaginated<Problem>> {
        return await this.problemDAO.findAll({}, page, perPage)
    }
}