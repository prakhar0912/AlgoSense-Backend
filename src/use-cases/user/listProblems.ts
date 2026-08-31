import type { Problem } from "../../entities/index.js";
import { InternalServerError, ValidationError } from "../../errors/index.js";
import type { IPaginated, IProblemDAO, IUseCase } from "../../interfaces/index.js";



type OptionalWithUndefined<T> = {
  [K in keyof T]?: T[K] | undefined
}
type FilterProblemPayload = OptionalWithUndefined<
  Omit<Partial<Problem>, "approaches" | "id" | 'hints' | 'evaluation_criteria'>>;





export default class ListProblemsForUser implements IUseCase<IPaginated<Omit<Problem, 'approaches' | 'hints' | 'evaluation_criteria'>>> {
  constructor(
    private problemDAO: IProblemDAO,
  ) { }
  async call(filters: FilterProblemPayload = {}, page: number = 1, perPage: number = 10): Promise<IPaginated<Omit<Problem, 'approaches' | 'hints' | 'evaluation_criteria'>>> {
    if (page < 1 || perPage < 1 || !Number.isInteger(page) || !Number.isInteger(perPage) || !Number.isFinite(page) || !Number.isFinite(perPage)) {
      throw new ValidationError('Page and perPage must be positive whole integers')
    }
    let paginatedProblems: IPaginated<Omit<Problem, 'approaches' | 'hints' | 'evaluation_criteria'>>
    try {
      paginatedProblems = await this.problemDAO.listForUser(filters as Partial<Omit<Problem, 'hints' | 'approaches' | 'evaluation_criteria'>>, page, perPage)
    }
    catch (e) {
      throw new InternalServerError('Error while fetching problems from DB')
    }
    return paginatedProblems
  }
}
