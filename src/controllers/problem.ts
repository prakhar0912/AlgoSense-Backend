import type { Approach, Problem } from "../entities/index.js";
import { InternalServerError, ValidationError } from "../errors/index.js";
import type { IPaginated, IRequest, IValidator } from "../interfaces/index.js";
import type { ListProblemsForUser, GetProblemByIdForUser, GetProblemBySlugForUser } from "../use-cases/user/index.js";
import type { GetProblemBySlugForAdmin, GetProblemByIdForAdmin, ListProblemsForAdmin, CreateProblem, DeleteProblem, UpdateProblem } from "../use-cases/admin/index.js"


// Conforming with Zod for type agreement
type OptionalWithUndefined<T> = {
  [K in keyof T]?: T[K] | undefined
}
type UpdateProblemPayload =
  Omit<Partial<Problem>, "approaches" | "id">
  & {
    approaches?: Partial<OptionalWithUndefined<Approach>[] | []>;
  };


export default class ProblemController {
  constructor(

    protected listProblemsForAdmin: ListProblemsForAdmin,
    protected listProblemsForUser: ListProblemsForUser,
    protected getProblemByIdForUser: GetProblemByIdForUser,
    protected getProblemByIdForAdmin: GetProblemByIdForAdmin,
    protected getProblemBySlugForUser: GetProblemBySlugForUser,
    protected getProblemBySlugForAdmin: GetProblemBySlugForAdmin,
    protected createProblem: CreateProblem,
    protected deleteProblem: DeleteProblem,
    protected updateProblem: UpdateProblem,


    // protected updateProblem: IUseCase<Problem>,

    protected addProblemDataTypeValidator: IValidator<Omit<Problem, 'id'>>,
    protected updateProblemDataTypeValidator: IValidator<OptionalWithUndefined<UpdateProblemPayload>>,
    protected filterProblemDataTypeValidator: IValidator<OptionalWithUndefined<Omit<Problem, 'hints' | 'approaches' | 'evaluation_criteria'>>>
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


  async getPaginatedProblemsForAdmin(request: IRequest): Promise<IPaginated<Problem>> {
    let validationResult
    try {
      validationResult = this.updateProblemDataTypeValidator.validate(request.body as OptionalWithUndefined<UpdateProblemPayload>)
    } catch (e) {
      throw new InternalServerError('User Filter Data Validation Function Failed', e)
    }
    if (!validationResult.success || validationResult.errors) {
      throw new ValidationError('Invalid User Filter Data', validationResult.errors)
    }

    const { page, perPage } = this.validatePaginationParams(request.params);
    return await this.listProblemsForAdmin.call(validationResult.data, page, perPage)
  }

  async getPaginatedProblemsForUser(request: IRequest): Promise<IPaginated<Omit<Problem, 'hints' | 'approaches' | 'evaluation_criteria'>>> {
    let validationResult
    try {
      validationResult = this.filterProblemDataTypeValidator.validate(request.body as Partial<Omit<Problem, 'hints' | 'approaches' | 'evaluation_criteria'>>)
    } catch (e) {
      throw new InternalServerError('User Filter Data Validation Function Failed', e)
    }
    if (!validationResult.success || validationResult.errors) {
      throw new ValidationError('Invalid User Filter Data', validationResult.errors)
    }

    const { page, perPage } = this.validatePaginationParams(request.params);
    return await this.listProblemsForUser.call(validationResult.data, page, perPage)
  }

  async getProblemByIdAdmin(request: IRequest): Promise<Problem> {
    const problemId = request.params?.id
    if (!problemId || typeof problemId !== "string") {
      throw new ValidationError('Problem Id is required')
    }

    return await this.getProblemByIdForAdmin.call(problemId)
  }

  async getProblemByIdUser(request: IRequest): Promise<Omit<Problem, 'hints' | 'approaches' | 'evaluation_criteria'>> {
    const problemId = request.params?.id
    if (!problemId || typeof problemId !== "string") {
      throw new ValidationError('Problem Id is required')
    }

    return await this.getProblemByIdForUser.call(problemId)
  }

  async getProblemBySlugAdmin(request: IRequest): Promise<Problem> {
    const problemSlug = request.params?.id
    if (!problemSlug || typeof problemSlug !== "string") {
      throw new ValidationError('Problem Id is required')
    }

    return await this.getProblemBySlugForAdmin.call(problemSlug)
  }

  async getProblemBySlugUser(request: IRequest): Promise<Omit<Problem, 'hints' | 'approaches' | 'evaluation_criteria'>> {
    const problemSlug = request.params?.id
    if (!problemSlug || typeof problemSlug !== "string") {
      throw new ValidationError('Problem Id is required')
    }
    return await this.getProblemBySlugForUser.call(problemSlug)
  }

  async addProblem(request: IRequest): Promise<Problem> {
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
    const problemId = request.params?.id
    if (typeof problemId !== "string") {
      throw new ValidationError('Valid Problem ID is required')
    }

    const problem = await this.deleteProblem.call(problemId)
    return problem
  }

  async updateProblemById(request: IRequest): Promise<Problem> {
    let validationResult
    try {
      validationResult = this.updateProblemDataTypeValidator.validate(request.body as OptionalWithUndefined<UpdateProblemPayload>)
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
