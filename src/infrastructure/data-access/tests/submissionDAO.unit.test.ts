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
  user_input: string;
  timer: number | string | null;
  approach_score: number | string | null;
  identified_approach: string | null;
  pass: boolean;
  missing_points: unknown;
  edge_cases_missed: unknown;
  edge_case_score: number | string;
  submitted_at: string | Date | null;
};

function buildSubmissionRow(overrides: Partial<SubmissionRow> = {}): SubmissionRow {
  return {
    id: "submission-123",
    user_id: "user-123",
    problem_id: "problem-123",
    difficulty: 2.5,
    user_input: "console.log('hello')",
    timer: 12,
    approach_score: 9,
    identified_approach: "Dynamic programming",
    pass: true,
    missing_points: ["point-1"],
    edge_cases_missed: ["edge-1"],
    edge_case_score: 8,
    submitted_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildSubmission(overrides: Partial<Submission> = {}): Submission {
  return Object.assign(new Submission(), {
    id: "submission-123",
    user_id: "user-123",
    problem_id: "problem-123",
    difficulty: 2.5,
    user_input: "console.log('hello')",
    timer: 12,
    approach_score: 9,
    identified_approach: "Dynamic programming",
    pass: true,
    missing_points: ["point-1"],
    edge_cases_missed: ["edge-1"],
    edge_case_score: 8,
    submitted_at: "2026-01-01T00:00:00.000Z",
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
      difficulty: 2.5,
      user_input: "console.log('hello')",
      timer: 12,
      approach_score: 9,
      identified_approach: "Dynamic programming",
      pass: true,
      missing_points: ["point-1"],
      edge_cases_missed: ["edge-1"],
      edge_case_score: 8,
      submitted_at: "2026-01-01T00:00:00.000Z",
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
    expect(sql).toContain("RETURNING");
    expect(params).toEqual([
      payload.user_id,
      payload.problem_id,
      payload.difficulty,
      payload.user_input,
      payload.timer,
      payload.approach_score,
      payload.identified_approach,
      payload.pass,
      payload.missing_points,
      payload.edge_cases_missed,
      payload.edge_case_score,
      payload.submitted_at,
    ]);
    expect(result).toEqual(buildSubmission());
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
      data: [buildSubmission({
        id: "submission-2",
        user_input: "console.log(2)",
        submitted_at: "2026-01-03T00:00:00.000Z",
      }), buildSubmission({
        id: "submission-1",
        user_input: "console.log(1)",
        submitted_at: "2026-01-02T00:00:00.000Z",
      })],
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
        difficulty: 2.5,
        user_input: "console.log('hello')",
        timer: 12,
        approach_score: 9,
        identified_approach: "Dynamic programming",
        pass: true,
        missing_points: ["point-1"],
        edge_cases_missed: ["edge-1"],
        edge_case_score: 8,
        submitted_at: "2026-01-01T00:00:00.000Z",
      }),
    ).rejects.toThrow("Submission creation data didn't persist in the database");
  });
});
