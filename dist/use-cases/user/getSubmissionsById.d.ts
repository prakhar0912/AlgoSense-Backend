import type IUseCase from "../../interfaces/useCase.js";
import type IPaginated from "../../interfaces/paginated.js";
import type Submission from "../../entities/submission.js";
import type ISubmissionDAO from "../../interfaces/submission/submissionDAO.js";
export default class GetSubmissionsById implements IUseCase<IPaginated<Submission>> {
    private submissionDAO;
    constructor(submissionDAO: ISubmissionDAO);
    call(userId: string): Promise<IPaginated<Submission>>;
}
//# sourceMappingURL=getSubmissionsById.d.ts.map