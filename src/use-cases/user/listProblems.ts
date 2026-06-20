import type Problem from "../../entities/problem.js";
import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
import type IPaginated from "../../interfaces/paginated.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";




export default class ListProblems implements IUseCase<IPaginated<Problem>> {
    constructor(
        private problemDAO: IProblemDAO,
    ) { }
    async call(page: number = 1, perPage: number = 10): Promise<IPaginated<Problem>> {
        if (page < 1 || perPage < 1 || !Number.isInteger(page) || !Number.isInteger(perPage) || !Number.isFinite(page) || !Number.isFinite(perPage)) {
            throw new ValidationError('Page and perPage must be positive whole integers')
        }
        let paginatedProblems: IPaginated<Problem>
        try{
            paginatedProblems = await this.problemDAO.list({}, page, perPage)
        }
        catch(e){
            throw new InternalServerError('Error while fetching problems from DB')
        }
        return paginatedProblems
    }
}