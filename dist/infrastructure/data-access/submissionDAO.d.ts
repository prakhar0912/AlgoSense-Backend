import type { PoolClient } from "pg";
import Submission from "../../entities/submission.js";
import type IPaginated from "../../interfaces/paginated.js";
import type ISubmissionDAO from "../../interfaces/submission/submissionDAO.js";
type DbClient = Pick<PoolClient, "query">;
type SubmissionScoreView = Pick<Submission, "problem_id" | "difficulty" | "approach_score" | "edge_case_score" | "submitted_at">;
export default class SubmissionDAO implements ISubmissionDAO {
    private readonly db;
    constructor(db?: DbClient);
    create(submissionPayload: Partial<Submission>): Promise<Submission>;
    viewById(submissionId: string): Promise<Submission>;
    viewByUser(userId: string): Promise<IPaginated<Submission>>;
    viewScoresByUser(userId: string): Promise<SubmissionScoreView[]>;
}
export {};
//# sourceMappingURL=submissionDAO.d.ts.map