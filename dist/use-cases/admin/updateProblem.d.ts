import type Problem from "../../entities/problem.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IValidator from "../../interfaces/validator.js";
export default class UpdateProblem implements IUseCase<Problem> {
    private problemDAO;
    private updateProblemValidator;
    constructor(problemDAO: IProblemDAO, updateProblemValidator: IValidator<Problem>);
    call(problemId: string, payload: Partial<Problem>): Promise<Problem>;
}
//# sourceMappingURL=updateProblem.d.ts.map