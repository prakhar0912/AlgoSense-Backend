import type { Problem } from "../../entities/index.js";
import { ValidationError, InternalServerError, NotFoundError } from "../../errors/index.js";
import type { IProblemDAO, IUseCase } from "../../interfaces/index.js";



export default class GetProblemByIdForUser implements IUseCase<Omit<Problem, 'approaches' | 'hints' | 'evaluation_criteria'>> {
  constructor(
    private problemDAO: IProblemDAO
  ) { }
  async call(problemId: string): Promise<Omit<Problem, 'approaches' | 'hints' | 'evaluation_criteria'>> {
    if (typeof problemId !== "string") {
      throw new ValidationError('Problem ID must be a valid string')
    }
    let problem: Omit<Problem, 'approaches' | 'hints' | 'evaluation_criteria'> | null | undefined
    try {
      problem = await this.problemDAO.findByIdForUsers(problemId)
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
