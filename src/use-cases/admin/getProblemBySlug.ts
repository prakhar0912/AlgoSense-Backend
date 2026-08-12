import type Problem from "../../entities/problem.js";
import { ValidationError } from "../../errors/index.js";
import InternalServerError from "../../errors/internalServerError.js";
import NotFoundError from "../../errors/notFoundError.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";

export default class GetProblemBySlugForAdmin implements IUseCase<Problem> {
  constructor(
    private problemDAO: IProblemDAO
  ) { }
  async call(problemSlug: string): Promise<Problem> {
    if (typeof problemSlug !== "string") {
      throw new ValidationError('Problem ID must be a valid string')
    }
    let problem: Problem | null | undefined
    try {
      problem = await this.problemDAO.findBySlug(problemSlug)
    }
    catch (e) {
      throw new InternalServerError('Unable to fetch problem from DB', e)
    }
    if (!problem) {
      throw new NotFoundError('Problem not found in DB')
    }
    return problem
  }
}
