import type { Submission } from "../../entities/index.js";
import type { IPaginated } from "../index.js";

export interface ISubmissionDAO {
  findById(userId: string, submissionId: string): Promise<Required<Submission> | null>
  createInitial(initialSubmissionPayload: Pick<Submission, 'status' | 'timer' | 'problem_id' | 'submitted_at' | 'user_id' | 'user_input' | 'hints_used'>): Promise<Pick<Submission, 'problem_id' | 'submitted_at' | 'user_id' | 'user_input' | 'hints_used' | 'id' | 'timer' | 'status'>>
  createFinalSubmission(submissionPayload: Partial<Submission>): Promise<Submission>;
  viewById(submissionId: string): Promise<Submission | null>;
  viewByUser(userId: string): Promise<IPaginated<Submission>>;
  viewScoresByUser(userId: string): Promise<Pick<Required<Submission>, 'problem_id' | 'difficulty' | 'approach_score' | 'edge_case_score' | 'submitted_at'>[]>;
  viewNumberOfSubmissionsPerUserPerProblem(userId: string, problemId: string): Promise<number> // Find and return the number of rows/entries from the "submissions" table, for a specific "user_id" provided as the argument "userId" and a specific "problem_id" provided as the argument "problemId". 
  updateStatus(submissionId: string, status: Submission['status']): Promise<Pick<Submission, 'status' | 'timer' | 'problem_id' | 'submitted_at' | 'user_id' | 'user_input' | 'hints_used' | 'id'>>
}

// id uuid NOT NULL DEFAULT uuidv7(),
// problem_id uuid NOT NULL,
// timer bigint,
// approach_score smallint NOT NULL,
// identified_approach character varying(100) COLLATE pg_catalog."default" NOT NULL,
// pass boolean NOT NULL,
// edge_case_score smallint NOT NULL,
// submitted_at character varying(30) COLLATE pg_catalog."default" NOT NULL,
// edge_cases jsonb[],
// user_input character varying(3000) COLLATE pg_catalog."default",
// difficulty difficulty_enum NOT NULL,
// problem_rating double precision NOT NULL,
// hints_used character varying(1000)[] COLLATE pg_catalog."default",
// elo_diff double precision NOT NULL,
// missing_points character varying(4000) COLLATE pg_catalog."default",
// user_id character varying(100) COLLATE pg_catalog."default" NOT NULL,
// CONSTRAINT submissions_pkey PRIMARY KEY (id, identified_approach)
