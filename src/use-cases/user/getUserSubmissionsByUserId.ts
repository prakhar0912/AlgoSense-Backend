import { UnauthorizedError, InternalServerError } from "../../errors/index.js";
import type { IUseCase, IPaginated, ISubmissionDAO } from "../../interfaces/index.js";
import type { Submission } from "../../entities/index.js";



export default class GetUserSubmissionsByUserId implements IUseCase<IPaginated<Submission>> {
  constructor(
    private submissionDAO: ISubmissionDAO
  ) { }
  async call(userId: string) {
    if (typeof userId !== "string" || typeof userId === "string" && userId.length === 0) {
      throw new UnauthorizedError('Please provide a UserId to authenticate')
    }
    let submissions
    try {
      submissions = await this.submissionDAO.viewByUser(userId)
    }
    catch (e) {
      throw new InternalServerError('Error while fetching user from DB')
    }
    return submissions

  }
}
