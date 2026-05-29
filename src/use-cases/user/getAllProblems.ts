import type Problem from "../../entities/problem.js";
import type IPaginated from "../../interfaces/paginated.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";

export default class getAllProblems implements IUseCase<IPaginated<Problem>>{
    constructor(
        private problemDAO: IProblemDAO
    ){}
    async call(page: number = 1, perPage: number = 10): Promise<IPaginated<Problem>>{
        let data = await this.problemDAO.list({}, page, perPage)
        return {
            data: data.data,
            pagination: {
                page: data.pagination.page,
                perPage: data.pagination.perPage
            }
        }
    }
}