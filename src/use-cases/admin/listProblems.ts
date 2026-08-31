import type { Approach, Problem } from "../../entities/index.js";
import { InternalServerError, ValidationError } from "../../errors/index.js";
import type { IPaginated, IProblemDAO, IUseCase } from "../../interfaces/index.js";


type OptionalWithUndefined<T> = {
  [K in keyof T]?: T[K] | undefined
}
type UpdateProblemPayload = OptionalWithUndefined<
  Omit<Partial<Problem>, "approaches" | "id">
  & {
    approaches?: Partial<OptionalWithUndefined<Approach>[] | []>;
  }>;




export default class ListProblemsForAdmin implements IUseCase<IPaginated<Problem>> {
  constructor(
    private problemDAO: IProblemDAO,
  ) { }
  async call(filters: UpdateProblemPayload = {}, page: number = 1, perPage: number = 10): Promise<IPaginated<Problem>> {
    if (page < 1 || perPage < 1 || !Number.isInteger(page) || !Number.isInteger(perPage) || !Number.isFinite(page) || !Number.isFinite(perPage)) {
      throw new ValidationError('Page and perPage must be positive whole integers')
    }
    let paginatedProblems: IPaginated<Problem>
    try {
      paginatedProblems = await this.problemDAO.list(filters as Partial<Problem>, page, perPage)
    }
    catch (e) {
      throw new InternalServerError('Error while fetching problems from DB')
    }
    return paginatedProblems
  }
}
