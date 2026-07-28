import type Submission from "../../entities/submission.js";
import type IPaginated from "../paginated.js";
export default interface ISubmissionDAO {
    create(submissionPayload: Partial<Submission>): Promise<Submission>;
    viewById(submissionId: string): Promise<Submission>;
    viewByUser(userId: string): Promise<IPaginated<Submission>>;
    viewScoresByUser(userId: string): Promise<Pick<Submission, 'problem_id' | 'difficulty' | 'approach_score' | 'edge_case_score' | 'submitted_at'>[] | []>;
}
//# sourceMappingURL=submissionDAO.d.ts.map