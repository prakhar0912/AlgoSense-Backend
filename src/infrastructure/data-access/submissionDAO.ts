import client from "./client.js";
import type { PoolClient, QueryResultRow } from "pg";

import { Submission } from "../../entities/index.js";
import type { IPaginated, ISubmissionDAO } from "../../interfaces/index.js";



type DbClient = Pick<PoolClient, "query">;
type SubmissionDifficulty = Submission["difficulty"];
type SubmissionScoreView = Pick<Submission, "problem_id" | "difficulty" | "approach_score" | "edge_case_score" | "submitted_at">;
type SubmissionEdgeCaseImportance = "critical" | "high" | "medium" | "low";
type SubmissionEdgeCaseCoverage = "correct" | "partial" | "incorrect" | "missing";
type SubmissionEdgeCase = {
  description: string;
  importance: SubmissionEdgeCaseImportance;
  coverage: SubmissionEdgeCaseCoverage;
};

type SubmissionRow = QueryResultRow & {
  id: string;
  user_id: string;
  problem_id: string;
  problem_title: string;
  difficulty: number | string;
  problem_rating: number | string;
  user_input: string;
  hints_used: unknown;
  timer: number | string | null;
  approach_score: number | string | null;
  identified_approach: string | null;
  pass: boolean;
  missing_points: unknown;
  edge_cases: unknown;
  edge_case_score: number | string | null;
  submitted_at: string | Date | null;
  elo_diff: number | string | null;
};

type SubmissionScoreRow = QueryResultRow & {
  problem_id: string;
  difficulty: number | string;
  approach_score: number | string | null;
  edge_case_score: number | string | null;
  submitted_at: string | Date | null;
};

type SubmissionCountRow = QueryResultRow & {
  count: number | string;
};

const SUBMISSION_COLUMNS = [
  "id",
  "user_id",
  "problem_id",
  "problem_title",
  "difficulty",
  "problem_rating",
  "user_input",
  "hints_used",
  "timer",
  "approach_score",
  "identified_approach",
  "pass",
  "missing_points",
  "edge_cases",
  "edge_case_score",
  "submitted_at",
  "elo_diff",
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

function toDifficulty(value: unknown): SubmissionDifficulty {
  const normalized = typeof value === "string" ? value.trim() : String(value);

  if (normalized === "easy" || normalized === "1" || normalized === "1.0") {
    return "easy";
  }

  if (normalized === "medium" || normalized === "2.5") {
    return "medium";
  }

  if (normalized === "hard" || normalized === "6") {
    return "hard";
  }

  if (normalized === "expert" || normalized === "7") {
    return "expert";
  }

  return "easy";
}

function toStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim().length > 0 ? [value] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function toMissingPointsValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").join(", ");
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function toEdgeCaseImportance(value: unknown): SubmissionEdgeCaseImportance {
  if (value === "critical" || value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "low";
}

function toEdgeCaseCoverage(value: unknown): SubmissionEdgeCaseCoverage {
  if (value === "correct" || value === "partial" || value === "incorrect" || value === "missing") {
    return value;
  }

  return "correct";
}

function normalizeEdgeCase(value: unknown): SubmissionEdgeCase | null {
  if (isRecord(value)) {
    return {
      description: typeof value.description === "string" ? value.description : "",
      importance: toEdgeCaseImportance(value.importance),
      coverage: toEdgeCaseCoverage(value.coverage),
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
          importance: toEdgeCaseImportance(parsed.importance),
          coverage: toEdgeCaseCoverage(parsed.coverage),
        };
      }
    }
    catch {
      return {
        description: value,
        importance: "low",
        coverage: "missing",
      };
    }

    return {
      description: value,
      importance: "low",
      coverage: "missing",
    };
  }

  return null;
}

function toEdgeCaseArray(value: unknown): SubmissionEdgeCase[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? toEdgeCaseArray(parsed) : [];
    }
    catch {
      return [];
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeEdgeCase(item)).filter((item): item is SubmissionEdgeCase => item !== null);
}

function buildSelectColumns(): string {
  return SUBMISSION_COLUMNS.join(", ");
}

function normalizeSubmissionScoreRow(row: SubmissionScoreRow): SubmissionScoreView {
  return {
    problem_id: row.problem_id,
    difficulty: toDifficulty(row.difficulty),
    approach_score: toFiniteNumber(row.approach_score),
    edge_case_score: toFiniteNumber(row.edge_case_score),
    submitted_at: toIsoString(row.submitted_at),
  };
}

function normalizeSubmissionRow(row: SubmissionRow): Submission {
  const submission = new Submission();
  const raw: Record<string, unknown> = isRecord(row) ? row : {};

  submission.id = typeof raw.id === "string" ? raw.id : row.id;
  submission.user_id = typeof raw.user_id === "string" ? raw.user_id : row.user_id;
  submission.problem_id = typeof raw.problem_id === "string" ? raw.problem_id : row.problem_id;
  submission.problem_title = typeof raw.problem_title === "string" ? raw.problem_title : row.problem_title;
  submission.difficulty = toDifficulty(raw.difficulty ?? row.difficulty);
  submission.problem_rating = toFiniteNumber(raw.problem_rating ?? row.problem_rating);
  submission.user_input = typeof raw.user_input === "string" ? raw.user_input : row.user_input;
  submission.hints_used = toStringArray(raw.hints_used ?? row.hints_used);
  submission.timer = raw.timer === null || raw.timer === undefined ? null : toFiniteNumber(raw.timer);
  submission.approach_score = toFiniteNumber(raw.approach_score ?? row.approach_score);
  submission.identified_approach = typeof raw.identified_approach === "string" ? raw.identified_approach : "";
  submission.pass = typeof raw.pass === "boolean" ? raw.pass : false;
  submission.missing_points = toMissingPointsValue(raw.missing_points ?? row.missing_points);
  submission.edge_cases = toEdgeCaseArray(raw.edge_cases ?? row.edge_cases);
  submission.edge_case_score = toFiniteNumber(raw.edge_case_score ?? row.edge_case_score);
  submission.submitted_at = toIsoString(raw.submitted_at ?? row.submitted_at ?? new Date());
  submission.elo_diff = toFiniteNumber(raw.elo_diff ?? row.elo_diff);

  return submission;
}

export default class SubmissionDAO implements ISubmissionDAO {
  constructor(private readonly db: DbClient = client) { }

  async create(submissionPayload: Partial<Submission>): Promise<Submission> {
    const query = `
      INSERT INTO submissions (
        user_id,
        problem_id,
        problem_title,
        difficulty,
        problem_rating,
        user_input,
        hints_used,
        timer,
        approach_score,
        identified_approach,
        pass,
        missing_points,
        edge_cases,
        edge_case_score,
        submitted_at,
        elo_diff
      )
      VALUES ($1, $2, $3, $4::difficulty_enum, $5::double precision, $6, $7::varchar[], $8::bigint, $9::smallint, $10, $11, $12, $13::jsonb[], $14::smallint, $15::varchar(30), $16::double precision)
      RETURNING ${buildSelectColumns()}
    `;

    const params = [
      submissionPayload.user_id,
      submissionPayload.problem_id,
      submissionPayload.problem_title,
      toDifficulty(submissionPayload.difficulty),
      submissionPayload.problem_rating,
      submissionPayload.user_input,
      submissionPayload.hints_used ?? [],
      submissionPayload.timer ?? null,
      submissionPayload.approach_score,
      submissionPayload.identified_approach ?? "",
      submissionPayload.pass ?? false,
      toMissingPointsValue(submissionPayload.missing_points),
      toEdgeCaseArray(submissionPayload.edge_cases),
      submissionPayload.edge_case_score,
      submissionPayload.submitted_at ? toIsoString(submissionPayload.submitted_at) : new Date().toISOString(),
      submissionPayload.elo_diff ?? 0,
    ];

    const result = await this.db.query<SubmissionRow>(query, params);

    if (result.rows[0]) {
      return normalizeSubmissionRow(result.rows[0]);
    }

    throw new Error("Submission creation data didn't persist in the database");
  }

  async viewById(submissionId: string): Promise<Submission | null> {
    const result = await this.db.query<SubmissionRow>(
      `SELECT ${buildSelectColumns()} FROM submissions WHERE id = $1 LIMIT 1`,
      [submissionId],
    );

    return result.rows[0] ? normalizeSubmissionRow(result.rows[0]) : null;
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

  async viewScoresByUser(userId: string): Promise<SubmissionScoreView[]> {
    const result = await this.db.query<SubmissionScoreRow>(
      `
        SELECT problem_id, difficulty, approach_score, edge_case_score, submitted_at
        FROM (
          SELECT DISTINCT ON (problem_id)
            problem_id,
            difficulty,
            approach_score,
            edge_case_score,
            submitted_at
          FROM submissions
          WHERE user_id = $1
          ORDER BY problem_id, approach_score DESC NULLS LAST, edge_case_score DESC NULLS LAST, submitted_at DESC NULLS LAST, id DESC
        ) best_submissions
        ORDER BY approach_score DESC NULLS LAST, edge_case_score DESC NULLS LAST, submitted_at DESC NULLS LAST, problem_id ASC
      `,
      [userId],
    );

    return result.rows.map((row) => normalizeSubmissionScoreRow(row));
  }
  async viewNumberOfSubmissionsPerUserPerProblem(userId: string, problemId: string): Promise<number> { // Count rows for a specific user/problem pair.
    const result = await this.db.query<SubmissionCountRow>(
      `
        SELECT COUNT(*)::int AS count
        FROM submissions
        WHERE user_id = $1
          AND problem_id = $2
      `,
      [userId, problemId],
    );

    const countRow = result.rows[0];
    if (!countRow) {
      return 0;
    }

    return toFiniteNumber(countRow.count);
  }
}
