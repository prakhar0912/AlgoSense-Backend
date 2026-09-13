import { UnauthorizedError, InternalServerError, NotFoundError } from "../../errors/index.js";
import type { IUseCase, IPaginated, ISubmissionDAO } from "../../interfaces/index.js";
import type { Submission } from "../../entities/index.js";



export default class GetSubmissionById implements IUseCase<Required<Submission>> {
  constructor(
    private submissionDAO: ISubmissionDAO
  ) { }
  async call(userId: string, submissionId: string) {
    let submission: Required<Submission> | null
    try {
      submission = await this.submissionDAO.findById(userId, submissionId)
    }
    catch (e) {
      throw new InternalServerError('Error while fetching user from DB')
    }
    if (!submission) {
      throw new NotFoundError('No such submission in the DB')
    }
    return submission
  }
}
