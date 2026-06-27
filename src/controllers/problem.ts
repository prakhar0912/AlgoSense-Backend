import type Problem from "../entities/problem.js";
import type User from "../entities/user.js";
import { InternalServerError, ValidationError } from "../errors/index.js";
import type IPaginated from "../interfaces/paginated.js";
import type IRequest from "../interfaces/request.js";
import type IUseCase from "../interfaces/useCase.js";
import type IValidator from "../interfaces/validator.js";

export default class ProblemController {
    constructor(
        protected authorizeUser: IUseCase<User>,
        protected authorizeAdmin: IUseCase<User>,

        protected listProblems: IUseCase<IPaginated<Problem>>,
        protected getProblem: IUseCase<Problem>,
        protected createProblem: IUseCase<Problem>,
        protected deleteProblem: IUseCase<boolean>,
        protected updateProblem: IUseCase<Problem>,

        protected addProblemDataTypeValidator: IValidator<Problem>,
        protected updateProblemDataTypeValidator: IValidator<Problem>,
    ) { }



    private validatePaginationParams(params?: IRequest['params']) {
        const page = params?.page;
        const perPage = params?.perPage;

        if (
            (page !== undefined && typeof page !== 'number') ||
            (perPage !== undefined && typeof perPage !== 'number')
        ) {
            throw new ValidationError('Params are required to be numbers');
        }

        return { page, perPage };
    }

    //Helper Functions Above


    async getPaginatedProblems(request: IRequest): Promise<IPaginated<Problem>> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const user = await this.authorizeUser.call(request.token)

        const { page, perPage } = this.validatePaginationParams(request.params);
        return await this.listProblems.call(page, perPage)
    }

    async getProblemById(request: IRequest): Promise<Problem> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const user = await this.authorizeUser.call(request.token)

        const problemId = request.params?.id
        if (!problemId || typeof problemId !== "string") {
            throw new ValidationError('Problem Id is required')
        }

        return await this.getProblem.call(problemId)
    }

    async addProblem(request: IRequest): Promise<Problem> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const user = await this.authorizeAdmin.call(request.token)

        if (!request.body || typeof request.body !== "object") {
            throw new ValidationError('Body is required')
        }

        let validationResult
        try {
            validationResult = this.addProblemDataTypeValidator.validate(request.body as Problem)
        } catch (e) {
            throw new InternalServerError('Problem Data Validation Function Failed', e)
        }
        if (!validationResult.success || !validationResult.data || validationResult.errors) {
            throw new ValidationError('Invalid Problem Data', validationResult.errors)
        }

        const problem = await this.createProblem.call(validationResult.data as Problem)
        return problem

    }

    async deleteProblemById(request: IRequest): Promise<boolean> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const user = await this.authorizeAdmin.call(request.token)

        const problemId = request.params?.id
        if (typeof problemId !== "string") {
            throw new ValidationError('Valid Problem ID is required')
        }

        const problem = await this.deleteProblem.call(problemId)
        return problem
    }

    async updateProblemById(request: IRequest): Promise<Problem> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const user = await this.authorizeAdmin.call(request.token)


        let validationResult
        try {
            validationResult = this.updateProblemDataTypeValidator.validate(request.body as Partial<Problem>)
        } catch (e) {
            throw new InternalServerError('Problem Data Validation Function Failed', e)
        }
        if (!validationResult.success || !validationResult.data || validationResult.errors) {
            throw new ValidationError('Invalid Problem Data', validationResult.errors)
        }
        const problemId = request.params?.id
        if (!problemId || typeof problemId !== "string") {
            throw new ValidationError('Problem ID is required')
        }

        const users = await this.updateProblem.call(problemId, validationResult.data)
        return users

    }
}