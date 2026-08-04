import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { PoolClient, QueryResultRow } from "pg";

import Submission from "../../../entities/submission.js";

const mockedClient = {
  query: jest.fn(),
  release: jest.fn(),
};

await jest.unstable_mockModule("../client.js", () => ({
  default: mockedClient,
}));

const { default: SubmissionDAO } = await import("../submissionDAO.js");

type DbClient = Pick<PoolClient, "query">;

type SubmissionRow = QueryResultRow & {
  id: string;
  user_id: string;
  problem_id: string;
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
  elo_dif: number | string | null;
};

type SubmissionScoreRow = QueryResultRow & Pick<
  SubmissionRow,
  "problem_id" | "difficulty" | "approach_score" | "edge_case_score" | "submitted_at"
>;

function buildSubmissionRow(overrides: Partial<SubmissionRow> = {}): SubmissionRow {
  return {
    id: "submission-123",
    user_id: "user-123",
    problem_id: "problem-123",
    difficulty: "medium",
    problem_rating: 4.5,
    user_input: "console.log('hello')",
    hints_used: ["Try using a map"],
    timer: 12,
    approach_score: 9,
    identified_approach: "Dynamic programming",
    pass: true,
    missing_points: "point-1",
    edge_cases: [{ description: "edge-1", importance: "high", coverage: "partial" }],
    edge_case_score: 8,
    submitted_at: "2026-01-01T00:00:00.000Z",
    elo_dif: 17.5,
    ...overrides,
  };
}

function buildSubmission(overrides: Partial<Submission> = {}): Submission {
  return Object.assign(new Submission(), {
    id: "submission-123",
    user_id: "user-123",
    problem_id: "problem-123",
    difficulty: "medium",
    problem_rating: 4.5,
    user_input: "console.log('hello')",
    hints_used: ["Try using a map"],
    timer: 12,
    approach_score: 9,
    identified_approach: "Dynamic programming",
    pass: true,
    missing_points: "point-1",
    edge_cases: [{ description: "edge-1", importance: "high", coverage: "partial" }],
    edge_case_score: 8,
    submitted_at: "2026-01-01T00:00:00.000Z",
    elo_dif: 17.5,
    ...overrides,
  });
}

describe("SubmissionDAO unit", () => {
  let query: jest.MockedFunction<DbClient["query"]>;
  let db: DbClient;
  let submissionDAO: SubmissionDAO;

  beforeEach(() => {
    query = jest.fn() as jest.MockedFunction<DbClient["query"]>;
    db = { query };
    submissionDAO = new SubmissionDAO(db);
    mockedClient.query.mockReset();
    mockedClient.release.mockReset();
  });

  it("creates a submission and returns the persisted entity", async () => {
    const payload: Partial<Submission> = {
      id: "submission-123",
      user_id: "user-123",
      problem_id: "problem-123",
      difficulty: "medium",
      problem_rating: 4.5,
      user_input: "console.log('hello')",
      hints_used: ["Try using a map"],
      timer: 12,
      approach_score: 9,
      identified_approach: "Dynamic programming",
      pass: true,
      missing_points: "point-1",
      edge_cases: [{ description: "edge-1", importance: "high", coverage: "partial" }],
      edge_case_score: 8,
      submitted_at: "2026-01-01T00:00:00.000Z",
      elo_dif: 17.5,
    };
    const persistedRow = buildSubmissionRow();

    query.mockResolvedValueOnce({
      rows: [persistedRow],
      rowCount: 1,
    } as never);

    const result = await submissionDAO.create(payload);

    expect(query).toHaveBeenCalledTimes(1);
    const call = query.mock.calls[0];
    if (!call) {
      throw new Error("Expected the DAO to issue one insert query");
    }

    const [sql, params] = call;
    expect(sql).toContain("INSERT INTO submissions");
    expect(sql).toContain("problem_rating");
    expect(sql).toContain("hints_used");
    expect(sql).toContain("missing_points");
    expect(sql).toContain("elo_diff");
    expect(sql).toContain("difficulty_enum");
    expect(sql).toContain("RETURNING");
    expect(params).toEqual([
      payload.user_id,
      payload.problem_id,
      payload.difficulty,
      payload.problem_rating,
      payload.user_input,
      payload.hints_used,
      payload.timer,
      payload.approach_score,
      payload.identified_approach,
      payload.pass,
      payload.missing_points,
      payload.edge_cases,
      payload.edge_case_score,
      payload.submitted_at,
      payload.elo_dif,
    ]);
    expect(result).toEqual(buildSubmission());
  });

  it("returns one best score projection per problem for a user", async () => {
    const scoreRows: SubmissionScoreRow[] = [
      {
        problem_id: "problem-777",
        difficulty: "hard",
        approach_score: "95",
        edge_case_score: "83",
        submitted_at: new Date("2026-01-07T00:00:00.000Z"),
      },
      {
        problem_id: "problem-555",
        difficulty: "medium",
        approach_score: 90,
        edge_case_score: "70",
        submitted_at: "2026-01-05T00:00:00.000Z",
      },
    ];

    query.mockResolvedValueOnce({
      rows: scoreRows,
      rowCount: scoreRows.length,
    } as never);

    const result = await submissionDAO.viewScoresByUser("user-123");

    expect(query).toHaveBeenCalledTimes(1);
    const call = query.mock.calls[0];
    if (!call) {
      throw new Error("Expected the DAO to issue one score projection query");
    }

    const [sql, params] = call;
    expect(sql).toContain("DISTINCT ON (problem_id)");
    expect(sql).toContain("WHERE user_id = $1");
    expect(params).toEqual(["user-123"]);
    expect(result).toEqual([
      {
        problem_id: "problem-777",
        difficulty: "hard",
        approach_score: 95,
        edge_case_score: 83,
        submitted_at: "2026-01-07T00:00:00.000Z",
      },
      {
        problem_id: "problem-555",
        difficulty: "medium",
        approach_score: 90,
        edge_case_score: 70,
        submitted_at: "2026-01-05T00:00:00.000Z",
      },
    ]);
  });

  it("returns null when no submission exists for an id", async () => {
    query.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    await expect(submissionDAO.viewById("missing-submission-id")).resolves.toBeNull();
  });

  it("returns a paginated submission list for a user", async () => {
    const firstRow = buildSubmissionRow({
      id: "submission-1",
      user_input: "console.log(1)",
      submitted_at: "2026-01-02T00:00:00.000Z",
    });
    const secondRow = buildSubmissionRow({
      id: "submission-2",
      user_input: "console.log(2)",
      submitted_at: "2026-01-03T00:00:00.000Z",
    });

    query.mockResolvedValueOnce({
      rows: [secondRow, firstRow],
      rowCount: 2,
    } as never);

    const result = await submissionDAO.viewByUser("user-123");

    expect(query).toHaveBeenCalledTimes(1);
    const call = query.mock.calls[0];
    if (!call) {
      throw new Error("Expected the DAO to issue one select query");
    }

    const [sql, params] = call;
    expect(sql).toContain("FROM submissions");
    expect(sql).toContain("ORDER BY submitted_at DESC, id DESC");
    expect(params).toEqual(["user-123"]);
    expect(result).toEqual({
      data: [
        buildSubmission({
          id: "submission-2",
          user_input: "console.log(2)",
          submitted_at: "2026-01-03T00:00:00.000Z",
        }),
        buildSubmission({
          id: "submission-1",
          user_input: "console.log(1)",
          submitted_at: "2026-01-02T00:00:00.000Z",
        }),
      ],
      pagination: {
        page: 1,
        perPage: 2,
      },
    });
  });

  it("throws when create does not persist a row", async () => {
    query.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    await expect(
      submissionDAO.create({
        id: "submission-123",
        user_id: "user-123",
        problem_id: "problem-123",
        difficulty: "medium",
        problem_rating: 4.5,
        user_input: "console.log('hello')",
        hints_used: ["Try using a map"],
        timer: 12,
        approach_score: 9,
        identified_approach: "Dynamic programming",
        pass: true,
        missing_points: "point-1",
        edge_cases: [{ description: "edge-1", importance: "high", coverage: "partial" }],
        edge_case_score: 8,
        submitted_at: "2026-01-01T00:00:00.000Z",
        elo_dif: 17.5,
      }),
    ).rejects.toThrow("Submission creation data didn't persist in the database");
  });
});
