import type Problem from "../../entities/problem.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
export default class GetProblem implements IUseCase<Problem> {
    private problemDAO;
    constructor(problemDAO: IProblemDAO);
    call(problemId: string): Promise<Problem>;
}
//# sourceMappingURL=getProblem.d.ts.map