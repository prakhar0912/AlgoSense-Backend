import type { Problem } from "../../entities/index.js";
import { ValidationError, InternalServerError, NotFoundError } from "../../errors/index.js";
import type { IProblemDAO, IUseCase } from "../../interfaces/index.js";



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
