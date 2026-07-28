import { InternalServerError, ValidationError } from "../errors/index.js";
export default class ProblemController {
    listProblems;
    getProblem;
    createProblem;
    deleteProblem;
    addProblemDataTypeValidator;
    constructor(listProblems, getProblem, createProblem, deleteProblem, 
    // protected updateProblem: IUseCase<Problem>,
    addProblemDataTypeValidator) {
        this.listProblems = listProblems;
        this.getProblem = getProblem;
        this.createProblem = createProblem;
        this.deleteProblem = deleteProblem;
        this.addProblemDataTypeValidator = addProblemDataTypeValidator;
    }
    validatePaginationParams(params) {
        const page = params?.page;
        const perPage = params?.perPage;
        if ((page !== undefined && typeof page !== 'number') ||
            (perPage !== undefined && typeof perPage !== 'number')) {
            throw new ValidationError('Params are required to be numbers');
        }
        return { page, perPage };
    }
    //Helper Functions Above
    async getPaginatedProblems(request) {
        const { page, perPage } = this.validatePaginationParams(request.params);
        return await this.listProblems.call(page, perPage);
    }
    async getProblemById(request) {
        const problemId = request.params?.id;
        if (!problemId || typeof problemId !== "string") {
            throw new ValidationError('Problem Id is required');
        }
        return await this.getProblem.call(problemId);
    }
    async addProblem(request) {
        if (!request.body || typeof request.body !== "object") {
            throw new ValidationError('Body is required');
        }
        let validationResult;
        try {
            validationResult = this.addProblemDataTypeValidator.validate(request.body);
        }
        catch (e) {
            throw new InternalServerError('Problem Data Validation Function Failed', e);
        }
        if (!validationResult.success || !validationResult.data || validationResult.errors) {
            throw new ValidationError('Invalid Problem Data', validationResult.errors);
        }
        const problem = await this.createProblem.call(validationResult.data);
        return problem;
    }
    async deleteProblemById(request) {
        const problemId = request.params?.id;
        if (typeof problemId !== "string") {
            throw new ValidationError('Valid Problem ID is required');
        }
        const problem = await this.deleteProblem.call(problemId);
        return problem;
    }
}
//# sourceMappingURL=problem.js.map