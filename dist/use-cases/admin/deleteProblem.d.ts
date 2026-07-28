import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
export default class DeleteProblem implements IUseCase<boolean> {
    private problemDAO;
    constructor(problemDAO: IProblemDAO);
    call(problemId: string): Promise<boolean>;
}
//# sourceMappingURL=deleteProblem.d.ts.map