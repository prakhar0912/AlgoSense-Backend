import type Problem from "../entities/problem.js";
import type IPaginated from "../interfaces/paginated.js";
import type IRequest from "../interfaces/request.js";
import type IUseCase from "../interfaces/useCase.js";
import type IValidator from "../interfaces/validator.js";
export default class ProblemController {
    protected listProblems: IUseCase<IPaginated<Problem>>;
    protected getProblem: IUseCase<Problem>;
    protected createProblem: IUseCase<Problem>;
    protected deleteProblem: IUseCase<boolean>;
    protected addProblemDataTypeValidator: IValidator<Omit<Problem, 'id'>>;
    constructor(listProblems: IUseCase<IPaginated<Problem>>, getProblem: IUseCase<Problem>, createProblem: IUseCase<Problem>, deleteProblem: IUseCase<boolean>, addProblemDataTypeValidator: IValidator<Omit<Problem, 'id'>>);
    private validatePaginationParams;
    getPaginatedProblems(request: IRequest): Promise<IPaginated<Problem>>;
    getProblemById(request: IRequest): Promise<Problem>;
    addProblem(request: IRequest): Promise<Problem>;
    deleteProblemById(request: IRequest): Promise<boolean>;
}
//# sourceMappingURL=problem.d.ts.map