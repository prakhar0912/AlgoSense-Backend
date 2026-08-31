import { InternalServerError } from "../../errors/index.js";
import type { IProblemDAO, IUseCase } from "../../interfaces/index.js";

export default class DeleteProblem implements IUseCase<boolean> {
  constructor(
    private problemDAO: IProblemDAO
  ) { }
  async call(problemId: string): Promise<boolean> {
    let success: boolean
    try {
      success = await this.problemDAO.delete(problemId)
    }
    catch (e) {
      throw new InternalServerError('Unable to delete the problem in the DB', e)
    }

    return success
  }
}
