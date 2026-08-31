import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import { Problem, Submission, User } from "../../../entities/index.js";
import client, { pool } from "../client.js";
import ProblemDAO from "../problemDAO.js";
import SubmissionDAO from "../submissionDAO.js";
import UserDAO from "../userDAO.js";

type TimingMetrics = {
  setupMs: number;
  seedMs: number;
  cleanupMs: number;
  createMs: number[];
  viewByIdMs: number[];
  viewByUserMs: number[];
  viewScoresByUserMs: number[];
  viewNumberOfSubmissionsPerUserPerProblemMs: number[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const runId = `submissiondao-${Date.now()}-${randomUUID().slice(0, 8)}`;
const suiteStartMs = performance.now();
const metrics: TimingMetrics = {
  setupMs: 0,
  seedMs: 0,
  cleanupMs: 0,
  createMs: [],
  viewByIdMs: [],
  viewByUserMs: [],
  viewScoresByUserMs: [],
  viewNumberOfSubmissionsPerUserPerProblemMs: [],
};

const problemDAO = new ProblemDAO(client);
const submissionDAO = new SubmissionDAO(client);
const userDAO = new UserDAO(client);

let createdFixturesInCurrentTest = 0;
let createdFixturesTotal = 0;
let cleanedFixturesTotal = 0;

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatAverage(values: number[]): string {
  return `${average(values).toFixed(5)} ms over ${values.length} runs`;
}

async function measure<T>(bucket: number[], action: () => Promise<T>): Promise<T> {
  const startedMs = performance.now();

  try {
    return await action();
  }
  finally {
    bucket.push(performance.now() - startedMs);
  }
}

function buildUserFixture(index: number): User {
  return Object.assign(new User(), {
    id: `${runId}-placeholder-user-${index}`,
    email: `${runId}.${index}@example.test`,
    first_name: `${runId}-first-${index}`,
    last_name: `${runId}-last-${index}`,
    role: "user" as const,
    banned: false,
    scores: null,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    last_5_submissions: null,
    email_verified: true,
    email_notifications_enabled: true,
  });
}

function buildProblemInput(index: number, difficulty: Problem["difficulty"]): Omit<Problem, "id"> {
  return {
    title: `${runId}-problem-${index}`,
    description: `${runId} description for submission problem ${index}`,
    rating: 4.5 + index,
    slug: `${runId}-problem-${index}-slug`,
    hints: [`hint-${index}-1`, `hint-${index}-2`],
    primary_topics: [`topic-${index}`, "hashTable"],
    secondary_topics: ["array", "sorting"],
    difficulty,
    approaches: [{
      type: `${runId}-approach-${index}`,
      primary_technique: `technique-${index}`,
      time_complexity: "O(n)",
      space_complexity: "O(1)",
      req_or_constraints: `constraint-${index}`,
      steps: [`step-${index}-1`, `step-${index}-2`],
      explanation: `explanation-${index}`,
      edge_cases: [{
        case: `edge-${index}`,
        importance: "high",
      }],
    }],
    evaluation_criteria: [`criterion-${index}`],
    similar_problems: ['similar-problem']
  };
}

async function seedUser(index: number): Promise<User> {
  const seedStartedMs = performance.now();

  try {
    const createdUser = await userDAO.create(buildUserFixture(index));
    createdFixturesInCurrentTest += 1;
    createdFixturesTotal += 1;
    return createdUser;
  }
  finally {
    metrics.seedMs += performance.now() - seedStartedMs;
  }
}

async function seedProblem(index: number, difficulty: Problem["difficulty"]): Promise<Problem> {
  const seedStartedMs = performance.now();

  try {
    const createdProblem = await problemDAO.create(buildProblemInput(index, difficulty));
    createdFixturesInCurrentTest += 1;
    createdFixturesTotal += 1;
    return createdProblem;
  }
  finally {
    metrics.seedMs += performance.now() - seedStartedMs;
  }
}

function buildSubmissionInput(
  userId: string,
  problem: Problem,
  submittedAt: string,
  overrides: Partial<Submission> = {},
): Partial<Submission> {
  const baseApproachScore = typeof overrides.approach_score === "number" ? overrides.approach_score : 75;

  return {
    user_id: userId,
    problem_id: problem.id,
    problem_rating: problem.rating,
    user_input: `console.log("${problem.id}")`,
    hints_used: [`${runId}-hint-${problem.id}`],
    difficulty: problem.difficulty,
    timer: baseApproachScore,
    approach_score: baseApproachScore,
    identified_approach: `${runId}-approach-${problem.id}`,
    pass: true,
    missing_points: `missing-${problem.id}`,
    edge_cases: [{
      description: `edge-${problem.id}`,
      importance: "high",
      coverage: "partial",
    }],
    edge_case_score: 50,
    submitted_at: submittedAt,
    elo_diff: 0,
    ...overrides,
  };
}

async function createSubmission(input: Partial<Submission>): Promise<Submission> {
  const createdSubmission = await measure(metrics.createMs, () => submissionDAO.create(input));
  createdFixturesInCurrentTest += 1;
  createdFixturesTotal += 1;
  return createdSubmission;
}

beforeAll(async () => {
  await client.query("SELECT 1");
  metrics.setupMs = performance.now() - suiteStartMs;
});

beforeEach(async () => {
  createdFixturesInCurrentTest = 0;
  await client.query("BEGIN");
});

afterEach(async () => {
  const cleanupStartMs = performance.now();

  try {
    await client.query("ROLLBACK");
  }
  finally {
    metrics.cleanupMs += performance.now() - cleanupStartMs;
    cleanedFixturesTotal += createdFixturesInCurrentTest;
    createdFixturesInCurrentTest = 0;
  }
});

afterAll(async () => {
  const totalRuntimeMs = performance.now() - suiteStartMs;

  console.info(
    `[SubmissionDAO integration] setup=${metrics.setupMs.toFixed(5)} ms seed=${metrics.seedMs.toFixed(5)} ms cleanup=${metrics.cleanupMs.toFixed(5)} ms created=${createdFixturesTotal} cleaned=${cleanedFixturesTotal} total=${totalRuntimeMs.toFixed(5)} ms`,
  );
  console.info(
    `[SubmissionDAO integration] create=${formatAverage(metrics.createMs)} viewById=${formatAverage(metrics.viewByIdMs)} viewByUser=${formatAverage(metrics.viewByUserMs)} viewScoresByUser=${formatAverage(metrics.viewScoresByUserMs)} viewNumberOfSubmissionsPerUserPerProblem=${formatAverage(metrics.viewNumberOfSubmissionsPerUserPerProblemMs)}`,
  );

  client.release();
  await pool.end();
});

describe("SubmissionDAO integration", () => {
  it("round-trips create, viewById, viewByUser, and viewScoresByUser against PostgreSQL", async () => {
    const createdUser = await seedUser(1);
    const easyProblem = await seedProblem(1, "easy");
    const mediumProblem = await seedProblem(2, "medium");
    const hardProblem = await seedProblem(3, "hard");

    const createdSubmissions: Submission[] = [];
    createdSubmissions.push(await createSubmission(buildSubmissionInput(
      createdUser.id,
      mediumProblem,
      new Date(Date.UTC(2026, 0, 1, 0, 0, 1)).toISOString(),
      {
        approach_score: 70,
        edge_case_score: 40,
      },
    )));
    createdSubmissions.push(await createSubmission(buildSubmissionInput(
      createdUser.id,
      mediumProblem,
      new Date(Date.UTC(2026, 0, 1, 0, 0, 2)).toISOString(),
      {
        approach_score: 80,
        edge_case_score: 30,
      },
    )));
    createdSubmissions.push(await createSubmission(buildSubmissionInput(
      createdUser.id,
      mediumProblem,
      new Date(Date.UTC(2026, 0, 1, 0, 0, 3)).toISOString(),
      {
        approach_score: 80,
        edge_case_score: 90,
      },
    )));
    createdSubmissions.push(await createSubmission(buildSubmissionInput(
      createdUser.id,
      hardProblem,
      new Date(Date.UTC(2026, 0, 1, 0, 0, 4)).toISOString(),
      {
        approach_score: 60,
        edge_case_score: 99,
      },
    )));
    createdSubmissions.push(await createSubmission(buildSubmissionInput(
      createdUser.id,
      hardProblem,
      new Date(Date.UTC(2026, 0, 1, 0, 0, 5)).toISOString(),
      {
        approach_score: 65,
        edge_case_score: 20,
      },
    )));
    createdSubmissions.push(await createSubmission(buildSubmissionInput(
      createdUser.id,
      easyProblem,
      new Date(Date.UTC(2026, 0, 1, 0, 0, 6)).toISOString(),
      {
        approach_score: 50,
        edge_case_score: 50,
      },
    )));

    expect(createdSubmissions).toHaveLength(6);
    for (const created of createdSubmissions) {
      expect(created).toBeInstanceOf(Submission);
      expect(created.id).toMatch(UUID_PATTERN);
      expect(created.user_id).toBe(createdUser.id);
      expect(created.problem_id === easyProblem.id || created.problem_id === mediumProblem.id || created.problem_id === hardProblem.id).toBe(true);
      expect(created.difficulty === "easy" || created.difficulty === "medium" || created.difficulty === "hard").toBe(true);
      expect(created.problem_rating).toBeGreaterThan(0);
      expect(created.hints_used).toHaveLength(1);
      expect(created.missing_points).toContain("missing-");
      expect(created.elo_diff).toBe(0);
    }

    const bestMediumSubmission = createdSubmissions[2];
    if (!bestMediumSubmission) {
      throw new Error("Expected the seeded medium submission to exist");
    }

    const lookedUp = await measure(metrics.viewByIdMs, () => submissionDAO.viewById(bestMediumSubmission.id));
    expect(lookedUp).toBeInstanceOf(Submission);
    expect(lookedUp).toMatchObject({
      id: bestMediumSubmission.id,
      user_id: createdUser.id,
      problem_id: mediumProblem.id,
      difficulty: "medium",
      problem_rating: mediumProblem.rating,
      hints_used: [`${runId}-hint-${mediumProblem.id}`],
      approach_score: 80,
      edge_case_score: 90,
      missing_points: `missing-${mediumProblem.id}`,
      elo_diff: 0,
    });

    const paginated = await measure(metrics.viewByUserMs, () => submissionDAO.viewByUser(createdUser.id));
    expect(paginated.pagination).toEqual({
      page: 1,
      perPage: 6,
    });
    expect(paginated.data).toHaveLength(6);
    expect(paginated.data[0]?.id).toBe(createdSubmissions[5]?.id);
    expect(paginated.data[5]?.id).toBe(createdSubmissions[0]?.id);

    const bestScores = await measure(metrics.viewScoresByUserMs, () => submissionDAO.viewScoresByUser(createdUser.id));
    const sortedBestScores = [...bestScores].sort((left, right) => left.difficulty.localeCompare(right.difficulty));

    expect(sortedBestScores).toEqual([
      {
        problem_id: easyProblem.id,
        difficulty: "easy",
        approach_score: 50,
        edge_case_score: 50,
        submitted_at: new Date(Date.UTC(2026, 0, 1, 0, 0, 6)).toISOString(),
      },
      {
        problem_id: hardProblem.id,
        difficulty: "hard",
        approach_score: 65,
        edge_case_score: 20,
        submitted_at: new Date(Date.UTC(2026, 0, 1, 0, 0, 5)).toISOString(),
      },
      {
        problem_id: mediumProblem.id,
        difficulty: "medium",
        approach_score: 80,
        edge_case_score: 90,
        submitted_at: new Date(Date.UTC(2026, 0, 1, 0, 0, 3)).toISOString(),
      },
    ]);

    const submissionCount = await measure(
      metrics.viewNumberOfSubmissionsPerUserPerProblemMs,
      () => submissionDAO.viewNumberOfSubmissionsPerUserPerProblem(createdUser.id, mediumProblem.id),
    );
    expect(submissionCount).toBe(3);
  });

  it("returns null, an empty page, and an empty score projection for missing submissions", async () => {
    const missingSubmissionId = randomUUID();
    const missingUserId = randomUUID();
    const missingProblemId = randomUUID();

    await expect(measure(metrics.viewByIdMs, () => submissionDAO.viewById(missingSubmissionId))).resolves.toBeNull();
    await expect(measure(metrics.viewByUserMs, () => submissionDAO.viewByUser(missingUserId))).resolves.toEqual({
      data: [],
      pagination: {
        page: 1,
        perPage: 0,
      },
    });
    await expect(measure(metrics.viewScoresByUserMs, () => submissionDAO.viewScoresByUser(missingUserId))).resolves.toEqual([]);
    await expect(measure(metrics.viewNumberOfSubmissionsPerUserPerProblemMs, () => submissionDAO.viewNumberOfSubmissionsPerUserPerProblem(missingUserId, missingProblemId))).resolves.toBe(0);
  });
});
