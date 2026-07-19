import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import Submission from "../../../entities/submission.js";
import client, { pool } from "../client.js";
import SubmissionDAO from "../submissionDAO.js";

type TimingMetrics = {
  setupMs: number;
  seedMs: number;
  cleanupMs: number;
  createMs: number[];
  viewByIdMs: number[];
  viewByUserMs: number[];
};

const TRIALS = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const metrics: TimingMetrics = {
  setupMs: 0,
  seedMs: 0,
  cleanupMs: 0,
  createMs: [],
  viewByIdMs: [],
  viewByUserMs: [],
};

const submissionDAO = new SubmissionDAO(client);
let seedUserId = "";
let seedProblemId = "";

const suiteStartMs = performance.now();

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatAverage(values: number[]): string {
  return `${average(values).toFixed(5)} ms`;
}

function buildSubmissionInput(index: number): Partial<Submission> {
  const submittedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString();

  return {
    user_id: seedUserId,
    problem_id: seedProblemId,
    user_input: `console.log(${index})`,
    difficulty: 2.5,
    timer: index,
    approach_score: 10 - index,
    identified_approach: `approach-${index}`,
    pass: index % 2 === 0,
    missing_points: [`missing-${index}`],
    edge_cases: [{
      description: `edge-${index}`,
      importance: "high",
      coverage: "partial",
    }],
    edge_case_score: 8 - index,
    submitted_at: submittedAt,
  };
}

beforeAll(async () => {
  const seedStartMs = performance.now();
  seedUserId = randomUUID();
  seedProblemId = randomUUID();
  metrics.seedMs = performance.now() - seedStartMs;
  metrics.setupMs = performance.now() - suiteStartMs;
});

beforeEach(async () => {
  await client.query("BEGIN");
});

afterEach(async () => {
  const cleanupStartMs = performance.now();
  try {
    await client.query("ROLLBACK");
  } finally {
    metrics.cleanupMs += performance.now() - cleanupStartMs;
  }
});

afterAll(async () => {
  console.info(
    `[SubmissionDAO integration] setup=${metrics.setupMs.toFixed(5)} ms seed=${metrics.seedMs.toFixed(5)} ms cleanup=${metrics.cleanupMs.toFixed(5)} ms createAvg=${formatAverage(metrics.createMs)} viewByIdAvg=${formatAverage(metrics.viewByIdMs)} viewByUserAvg=${formatAverage(metrics.viewByUserMs)}`,
  );
  client.release();
  await pool.end();
});

describe("SubmissionDAO integration", () => {
  it("round-trips create, viewById, and viewByUser against PostgreSQL and reports averages", async () => {
    const createdSubmissions: Submission[] = [];
    const createDurations: number[] = [];
    const viewByIdDurations: number[] = [];
    const viewByUserDurations: number[] = [];

    for (let index = 0; index < TRIALS; index += 1) {
      const input = buildSubmissionInput(index);
      const startedMs = performance.now();
      const created = await submissionDAO.create(input);
      const elapsedMs = performance.now() - startedMs;
      createDurations.push(elapsedMs);
      metrics.createMs.push(elapsedMs);
      createdSubmissions.push(created);

      expect(created.id).toMatch(UUID_PATTERN);
      expect(created.user_id).toBe(seedUserId);
      expect(created.problem_id).toBe(seedProblemId);
      expect(created.user_input).toBe(input.user_input);
      expect(created.difficulty).toBe(input.difficulty);
      expect(created.timer).toBe(input.timer);
      expect(created.approach_score).toBe(input.approach_score);
      expect(created.identified_approach).toBe(input.identified_approach);
      expect(created.pass).toBe(input.pass);
      expect(created.missing_points).toEqual(input.missing_points);
      expect(created.edge_cases).toEqual(input.edge_cases);
      expect(created.edge_case_score).toBe(input.edge_case_score);
      expect(new Date(created.submitted_at).toISOString()).toBe(input.submitted_at);
    }

    expect(createdSubmissions).toHaveLength(TRIALS);

    const latestSubmission = createdSubmissions[createdSubmissions.length - 1];
    if (!latestSubmission) {
      throw new Error("Expected a created submission to benchmark viewById");
    }

    for (let index = 0; index < TRIALS; index += 1) {
      const startedMs = performance.now();
      const lookedUp = await submissionDAO.viewById(createdSubmissions[index].id);
      const elapsedMs = performance.now() - startedMs;

      viewByIdDurations.push(elapsedMs);
      metrics.viewByIdMs.push(elapsedMs);

      if (!lookedUp) {
        throw new Error("Expected submission lookup to return a persisted row");
      }

      expect(lookedUp).toMatchObject({
        id: createdSubmissions[index].id,
        user_id: createdSubmissions[index].user_id,
        problem_id: createdSubmissions[index].problem_id,
        user_input: createdSubmissions[index].user_input,
        difficulty: createdSubmissions[index].difficulty,
        timer: createdSubmissions[index].timer,
        approach_score: createdSubmissions[index].approach_score,
        identified_approach: createdSubmissions[index].identified_approach,
        pass: createdSubmissions[index].pass,
        missing_points: createdSubmissions[index].missing_points,
        edge_cases: createdSubmissions[index].edge_cases,
        edge_case_score: createdSubmissions[index].edge_case_score,
      });
      expect(new Date(lookedUp.submitted_at).toISOString()).toBe(createdSubmissions[index].submitted_at);
    }

    for (let index = 0; index < TRIALS; index += 1) {
      const startedMs = performance.now();
      const paginated = await submissionDAO.viewByUser(seedUserId);
      const elapsedMs = performance.now() - startedMs;

      viewByUserDurations.push(elapsedMs);
      metrics.viewByUserMs.push(elapsedMs);

      expect(paginated.pagination).toEqual({
        page: 1,
        perPage: TRIALS,
      });
      expect(paginated.data).toHaveLength(TRIALS);

      const newestSubmission = paginated.data[0];
      const oldestSubmission = paginated.data[paginated.data.length - 1];

      if (!newestSubmission || !oldestSubmission) {
        throw new Error("Expected submitted rows to be returned in descending order");
      }

      expect(newestSubmission.id).toBe(createdSubmissions[createdSubmissions.length - 1]?.id);
      expect(oldestSubmission.id).toBe(createdSubmissions[0]?.id);
    }

    console.info(`[SubmissionDAO integration] create avg over ${TRIALS} runs: ${formatAverage(createDurations)}`);
    console.info(`[SubmissionDAO integration] viewById avg over ${TRIALS} runs: ${formatAverage(viewByIdDurations)}`);
    console.info(`[SubmissionDAO integration] viewByUser avg over ${TRIALS} runs: ${formatAverage(viewByUserDurations)}`);
  });

  it("returns null for a missing submission id and an empty page for a missing user", async () => {
    const missingSubmissionId = randomUUID();
    const missingUserId = randomUUID();
    const viewByIdDurations: number[] = [];
    const viewByUserDurations: number[] = [];

    for (let index = 0; index < TRIALS; index += 1) {
      const startedMs = performance.now();
      const result = await submissionDAO.viewById(missingSubmissionId);
      const elapsedMs = performance.now() - startedMs;

      viewByIdDurations.push(elapsedMs);
      metrics.viewByIdMs.push(elapsedMs);
      expect(result).toBeNull();
    }

    for (let index = 0; index < TRIALS; index += 1) {
      const startedMs = performance.now();
      const result = await submissionDAO.viewByUser(missingUserId);
      const elapsedMs = performance.now() - startedMs;

      viewByUserDurations.push(elapsedMs);
      metrics.viewByUserMs.push(elapsedMs);

      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          perPage: 0,
        },
      });
    }

    console.info(`[SubmissionDAO integration] viewById(empty) avg over ${TRIALS} runs: ${formatAverage(viewByIdDurations)}`);
    console.info(`[SubmissionDAO integration] viewByUser(empty) avg over ${TRIALS} runs: ${formatAverage(viewByUserDurations)}`);
  });
});
