import type Problem from "../../entities/problem.js";
import type IPaginated from "../../interfaces/paginated.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
export default class ListProblems implements IUseCase<IPaginated<Problem>> {
    private problemDAO;
    constructor(problemDAO: IProblemDAO);
    call(page?: number, perPage?: number): Promise<IPaginated<Problem>>;
}
//# sourceMappingURL=listProblems.d.ts.map