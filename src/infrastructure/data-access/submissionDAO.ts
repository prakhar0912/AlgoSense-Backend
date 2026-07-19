
import client from "./client.js";
import type { PoolClient, QueryResultRow } from "pg";

import Submission from "../../entities/submission.js";
import type IPaginated from "../../interfaces/paginated.js";
import type ISubmissionDAO from "../../interfaces/submission/submissionDAO.js";

type DbClient = Pick<PoolClient, "query">;

type SubmissionRow = QueryResultRow & {
  id: string;
  user_id: string;
  problem_id: string;
  difficulty: number | string;
  user_input: string;
  timer: number | string | null;
  approach_score: number | string | null;
  identified_approach: string | null;
  pass: boolean;
  missing_points: unknown;
  edge_cases: unknown;
  edge_cases_missed?: unknown;
  edge_case_score: number | string;
  submitted_at: string | Date | null;
};

const SUBMISSION_COLUMNS = [
  "id",
  "user_id",
  "problem_id",
  "difficulty",
  "user_input",
  "timer",
  "approach_score",
  "identified_approach",
  "pass",
  "missing_points",
  "edge_cases",
  "edge_case_score",
  "submitted_at",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toIsoString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toMissingPointsArray(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim().length > 0 ? [value] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

type SubmissionEdgeCase = {
  description: string;
  importance: string;
  coverage: string;
};

function normalizeEdgeCase(value: unknown): SubmissionEdgeCase | null {
  if (isRecord(value)) {
    return {
      description: typeof value.description === "string" ? value.description : "",
      importance: typeof value.importance === "string" ? value.importance : "",
      coverage: typeof value.coverage === "string" ? value.coverage : "",
    };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (isRecord(parsed)) {
        return {
          description: typeof parsed.description === "string" ? parsed.description : "",
          importance: typeof parsed.importance === "string" ? parsed.importance : "",
          coverage: typeof parsed.coverage === "string" ? parsed.coverage : "",
        };
      }
    }
    catch {
      return {
        description: value,
        importance: "",
        coverage: "",
      };
    }

    return {
      description: value,
      importance: "",
      coverage: "",
    };
  }

  return null;
}

function toEdgeCaseArray(value: unknown): SubmissionEdgeCase[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeEdgeCase(item)).filter((item): item is SubmissionEdgeCase => item !== null);
}

function buildSelectColumns(): string {
  return SUBMISSION_COLUMNS.join(", ");
}

function normalizeSubmissionRow(row: SubmissionRow): Submission {
  const submission = new Submission();
  const raw: Record<string, unknown> = isRecord(row) ? row : {};

  submission.id = typeof raw.id === "string" ? raw.id : row.id;
  submission.user_id = typeof raw.user_id === "string" ? raw.user_id : row.user_id;
  submission.problem_id = typeof raw.problem_id === "string" ? raw.problem_id : row.problem_id;
  submission.difficulty = toFiniteNumber(raw.difficulty ?? row.difficulty);
  submission.user_input = typeof raw.user_input === "string" ? raw.user_input : row.user_input;
  submission.timer = raw.timer === null || raw.timer === undefined ? null : toFiniteNumber(raw.timer);

  if (raw.approach_score !== undefined && raw.approach_score !== null) {
    submission.approach_score = toFiniteNumber(raw.approach_score);
  }

  submission.identified_approach = typeof raw.identified_approach === "string" ? raw.identified_approach : "";
  submission.pass = typeof raw.pass === "boolean" ? raw.pass : false;
  submission.missing_points = toMissingPointsArray(raw.missing_points ?? row.missing_points) as unknown as string;
  submission.edge_cases = toEdgeCaseArray(raw.edge_cases ?? raw.edge_cases_missed);
  submission.edge_case_score = toFiniteNumber(raw.edge_case_score ?? row.edge_case_score);
  submission.submitted_at = toIsoString(raw.submitted_at ?? row.submitted_at ?? new Date());

  return submission;
}

export default class SubmissionDAO implements ISubmissionDAO {
  constructor(private readonly db: DbClient = client) { }

  async create(submissionPayload: Partial<Submission>): Promise<Submission> {
    const query = `
      INSERT INTO submissions (
        user_id,
        problem_id,
        difficulty,
        user_input,
        timer,
        approach_score,
        identified_approach,
        pass,
        missing_points,
        edge_cases,
        edge_case_score,
        submitted_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10::jsonb[], $11, $12)
      RETURNING ${buildSelectColumns()}
    `;

    const params = [
      submissionPayload.user_id,
      submissionPayload.problem_id,
      submissionPayload.difficulty,
      submissionPayload.user_input,
      submissionPayload.timer ?? null,
      submissionPayload.approach_score ?? null,
      submissionPayload.identified_approach ?? "",
      submissionPayload.pass ?? false,
      toMissingPointsArray(submissionPayload.missing_points),
      submissionPayload.edge_cases ?? [],
      submissionPayload.edge_case_score ?? null,
      submissionPayload.submitted_at ? toIsoString(submissionPayload.submitted_at) : new Date().toISOString(),
    ];

    const result = await this.db.query<SubmissionRow>(query, params);

    if (result.rows[0]) {
      return normalizeSubmissionRow(result.rows[0]);
    }

    throw new Error("Submission creation data didn't persist in the database");
  }

  async viewById(submissionId: string): Promise<Submission> {
    const result = await this.db.query<SubmissionRow>(
      `SELECT ${buildSelectColumns()} FROM submissions WHERE id = $1 LIMIT 1`,
      [submissionId],
    );

    if (!result.rows[0]) {
      return null as unknown as Submission;
    }

    return normalizeSubmissionRow(result.rows[0]);
  }

  async viewByUser(userId: string): Promise<IPaginated<Submission>> {
    const result = await this.db.query<SubmissionRow>(
      `
        SELECT ${buildSelectColumns()}
        FROM submissions
        WHERE user_id = $1
        ORDER BY submitted_at DESC, id DESC
      `,
      [userId],
    );

    return {
      data: result.rows.map((row) => normalizeSubmissionRow(row)),
      pagination: {
        page: 1,
        perPage: result.rows.length,
      },
    };
  }
}
