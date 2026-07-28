import type Problem from "../../entities/problem.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IValidator from "../../interfaces/validator.js";
export default class CreateProblem implements IUseCase<Problem> {
    private problemDAO;
    private problemValidator;
    constructor(problemDAO: IProblemDAO, problemValidator: IValidator<Omit<Problem, 'id'>>);
    call(payload: Omit<Problem, 'id'>): Promise<Problem>;
}
//# sourceMappingURL=createProblem.d.ts.map