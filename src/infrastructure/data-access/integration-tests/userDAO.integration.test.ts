import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import ShortSubmission from "../../../entities/shortSubmission.js";
import User from "../../../entities/user.js";
import UserScores from "../../../entities/userScores.js";
import client, { pool } from "../client.js";
import UserDAO from "../userDAO.js";

type TimingMetrics = {
  setupMs: number;
  seedMs: number;
  cleanupMs: number;
  createMs: number[];
  findByIdMs: number[];
  findByEmailMs: number[];
  findAllMs: number[];
  updateMs: number[];
  updateSelfProfileMs: number[];
  updateUserMs: number[];
  deleteMs: number[];
  toggleBanUserMs: number[];
  unbanUserMs: number[];
  getUserScoresMs: number[];
  setUserScoresMs: number[];
  getUserSubmissionsMs: number[];
  getLast5SubmissionsMs: number[];
  setSubmissionsInProfileMs: number[];
  viewProfileMs: number[];
  toggleEmailNotificationsMs: number[];
};

type ScoreSeed = Pick<
  UserScores,
  "approaches_score" | "consistency_score" | "edge_case_score" | "days_logged_in"
>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const suiteStartMs = performance.now();
const runId = `userdao-${Date.now()}-${randomUUID().slice(0, 8)}`;
const userDAO = new UserDAO(client);

const metrics: TimingMetrics = {
  setupMs: 0,
  seedMs: 0,
  cleanupMs: 0,
  createMs: [],
  findByIdMs: [],
  findByEmailMs: [],
  findAllMs: [],
  updateMs: [],
  updateSelfProfileMs: [],
  updateUserMs: [],
  deleteMs: [],
  toggleBanUserMs: [],
  unbanUserMs: [],
  getUserScoresMs: [],
  setUserScoresMs: [],
  getUserSubmissionsMs: [],
  getLast5SubmissionsMs: [],
  setSubmissionsInProfileMs: [],
  viewProfileMs: [],
  toggleEmailNotificationsMs: [],
};

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

function max(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((currentMax, value) => Math.max(currentMax, value), values[0] ?? 0);
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

function buildExactScores(values: ScoreSeed): UserScores {
  const scores = new UserScores();
  Object.assign(scores, values);
  scores.total_score = scores.approaches_score + scores.consistency_score + scores.edge_case_score;
  return scores;
}

function buildUserFixture(index: number, overrides: Partial<User> = {}): User {
  const user = new User();
  Object.assign(user, {
    id: `${runId}-placeholder-${index}`,
    email: `${runId}.${index}@example.test`,
    first_name: `${runId}-first-${index}`,
    last_name: `${runId}-last-${index}`,
    role: "user" as const,
    banned: false,
    scores: null,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    last_5_submissions: null,
    email_verified: false,
    email_notifications_enabled: true,
    ...overrides,
  });

  return user;
}

function buildShortSubmissionFixture(index: number): ShortSubmission {
  const submission = new ShortSubmission();
  Object.assign(submission, {
    submission_id: `${runId}-submission-${index}`,
    problem_id: `${runId}-problem-${index}`,
    difficulty: 2.5,
    timer: index,
    approach_score: 10 + index,
    identified_approach: `${runId}-approach-${index}`,
    pass: index % 2 === 0,
    edge_case_score: 5 + index,
    submitted_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
  });

  return submission;
}

async function seedUser(user: User): Promise<User> {
  const seedStartedMs = performance.now();

  try {
    const createdUser = await measure(metrics.createMs, () => userDAO.create(user));
    createdFixturesTotal += 1;
    createdFixturesInCurrentTest += 1;
    return createdUser;
  }
  finally {
    metrics.seedMs += performance.now() - seedStartedMs;
  }
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
  const cleanupStartedMs = performance.now();

  try {
    await client.query("ROLLBACK");
  }
  finally {
    metrics.cleanupMs += performance.now() - cleanupStartedMs;
    cleanedFixturesTotal += createdFixturesInCurrentTest;
    createdFixturesInCurrentTest = 0;
  }
});

afterAll(async () => {
  const totalRuntimeMs = performance.now() - suiteStartMs;
  const methodSummaries = [
    ["create", metrics.createMs],
    ["findById", metrics.findByIdMs],
    ["findByEmail", metrics.findByEmailMs],
    ["findAll", metrics.findAllMs],
    ["update", metrics.updateMs],
    ["updateSelfProfile", metrics.updateSelfProfileMs],
    ["updateUser", metrics.updateUserMs],
    ["delete", metrics.deleteMs],
    ["toggleBanUser", metrics.toggleBanUserMs],
    ["unbanUser", metrics.unbanUserMs],
    ["getUserScores", metrics.getUserScoresMs],
    ["setUserScores", metrics.setUserScoresMs],
    ["getUserSubmissions", metrics.getUserSubmissionsMs],
    ["getLast5Submissions", metrics.getLast5SubmissionsMs],
    ["setSubmissionsInProfile", metrics.setSubmissionsInProfileMs],
    ["viewProfile", metrics.viewProfileMs],
    ["toggleEmailNotifications", metrics.toggleEmailNotificationsMs],
  ] as const;

  const slowestMethod = methodSummaries.reduce<{
    name: string;
    durationMs: number;
  }>((currentSlowest, [name, durations]) => {
    const durationMs = max(durations);
    if (durationMs > currentSlowest.durationMs) {
      return { name, durationMs };
    }

    return currentSlowest;
  }, {
    name: "setup",
    durationMs: metrics.setupMs,
  });

  console.info(
    `[UserDAO integration] setup=${metrics.setupMs.toFixed(5)} ms seed=${metrics.seedMs.toFixed(5)} ms cleanup=${metrics.cleanupMs.toFixed(5)} ms created=${createdFixturesTotal} cleaned=${cleanedFixturesTotal} total=${totalRuntimeMs.toFixed(5)} ms slowest=${slowestMethod.name}:${slowestMethod.durationMs.toFixed(5)} ms`,
  );
  console.info(
    `[UserDAO integration] create=${formatAverage(metrics.createMs)} findById=${formatAverage(metrics.findByIdMs)} findByEmail=${formatAverage(metrics.findByEmailMs)} findAll=${formatAverage(metrics.findAllMs)} viewProfile=${formatAverage(metrics.viewProfileMs)} getUserScores=${formatAverage(metrics.getUserScoresMs)} getUserSubmissions=${formatAverage(metrics.getUserSubmissionsMs)} getLast5Submissions=${formatAverage(metrics.getLast5SubmissionsMs)}`,
  );
  console.info(
    `[UserDAO integration] update=${formatAverage(metrics.updateMs)} updateSelfProfile=${formatAverage(metrics.updateSelfProfileMs)} updateUser=${formatAverage(metrics.updateUserMs)} delete=${formatAverage(metrics.deleteMs)} toggleBanUser=${formatAverage(metrics.toggleBanUserMs)} unbanUser=${formatAverage(metrics.unbanUserMs)} toggleEmailNotifications=${formatAverage(metrics.toggleEmailNotificationsMs)} setUserScores=${formatAverage(metrics.setUserScoresMs)} setSubmissionsInProfile=${formatAverage(metrics.setSubmissionsInProfileMs)}`,
  );

  client.release();
  await pool.end();
});

describe("UserDAO integration", () => {
  it("persists, updates, toggles, reads, and deletes a user end to end", async () => {
    const originalInput = buildUserFixture(0);
    const createdUser = await seedUser(originalInput);

    expect(createdUser).toBeInstanceOf(User);
    expect(createdUser.id).toMatch(UUID_PATTERN);
    expect(createdUser.id).not.toBe(originalInput.id);
    expect(createdUser.email).toBe(originalInput.email);
    expect(createdUser.first_name).toBe(originalInput.first_name);
    expect(createdUser.last_name).toBe(originalInput.last_name);
    expect(createdUser.role).toBe("user");
    expect(createdUser.banned).toBe(false);
    expect(createdUser.scores).toBeNull();
    expect(createdUser.last_5_submissions).toBeNull();
    expect(createdUser.email_verified).toBe(false);
    expect(createdUser.email_notifications_enabled).toBe(true);

    const foundById = await measure(metrics.findByIdMs, () => userDAO.findById(createdUser.id));
    expect(foundById).toBeInstanceOf(User);
    expect(foundById).toMatchObject({
      id: createdUser.id,
      email: originalInput.email,
      first_name: originalInput.first_name,
      last_name: originalInput.last_name,
      role: "user",
      banned: false,
      created_at: originalInput.created_at,
      email_verified: false,
      email_notifications_enabled: true,
    });
    expect(foundById?.scores).toBeNull();
    expect(foundById?.last_5_submissions).toBeNull();

    const foundByEmail = await measure(metrics.findByEmailMs, () => userDAO.findByEmail(originalInput.email));
    expect(foundByEmail).toBeInstanceOf(User);
    expect(foundByEmail?.id).toBe(createdUser.id);

    const profile = await measure(metrics.viewProfileMs, () => userDAO.viewProfile(createdUser.id));
    expect(profile).toBeInstanceOf(User);
    expect(profile?.id).toBe(createdUser.id);

    const spoofedId = randomUUID();
    const firstUpdateAt = new Date(Date.UTC(2026, 0, 1, 1, 0, 0)).toISOString();
    const afterUpdate = await measure(metrics.updateMs, () => userDAO.update(createdUser.id, {
      id: spoofedId,
      first_name: `${runId}-first-updated`,
      created_at: firstUpdateAt,
    }));
    expect(afterUpdate.id).toBe(createdUser.id);
    expect(afterUpdate.id).not.toBe(spoofedId);
    expect(afterUpdate.first_name).toBe(`${runId}-first-updated`);
    expect(afterUpdate.created_at).toBe(firstUpdateAt);

    const updatedEmail = `${runId}.updated@example.test`;
    const afterSelfProfile = await measure(metrics.updateSelfProfileMs, () => userDAO.updateSelfProfile(createdUser.id, {
      last_name: `${runId}-last-updated`,
      email: updatedEmail,
    }));
    expect(afterSelfProfile.id).toBe(createdUser.id);
    expect(afterSelfProfile.last_name).toBe(`${runId}-last-updated`);
    expect(afterSelfProfile.email).toBe(updatedEmail);

    await expect(measure(metrics.findByEmailMs, () => userDAO.findByEmail(originalInput.email))).resolves.toBeNull();
    const refetchedByEmail = await measure(metrics.findByEmailMs, () => userDAO.findByEmail(updatedEmail));
    expect(refetchedByEmail).toBeInstanceOf(User);
    expect(refetchedByEmail?.id).toBe(createdUser.id);

    const secondUpdateAt = new Date(Date.UTC(2026, 0, 1, 2, 0, 0)).toISOString();
    const afterUpdateUser = await measure(metrics.updateUserMs, () => userDAO.updateUser(createdUser.id, {
      email_verified: true,
      created_at: secondUpdateAt,
    }));
    expect(afterUpdateUser.id).toBe(createdUser.id);
    expect(afterUpdateUser.email_verified).toBe(true);
    expect(afterUpdateUser.created_at).toBe(secondUpdateAt);

    const bannedUser = await measure(metrics.toggleBanUserMs, () => userDAO.toggleBanUser(createdUser.id, true));
    expect(bannedUser.id).toBe(createdUser.id);
    expect(bannedUser.banned).toBe(true);

    const unbannedUser = await measure(metrics.unbanUserMs, () => userDAO.unbanUser(createdUser.id));
    expect(unbannedUser.id).toBe(createdUser.id);
    expect(unbannedUser.banned).toBe(false);

    const notificationsDisabled = await measure(metrics.toggleEmailNotificationsMs, () => userDAO.toggleEmailNotifications(createdUser.id, false));
    expect(notificationsDisabled).toBe(false);

    const deleted = await measure(metrics.deleteMs, () => userDAO.delete(createdUser.id));
    expect(deleted).toBe(true);

    await expect(measure(metrics.findByIdMs, () => userDAO.findById(createdUser.id))).resolves.toBeNull();
    await expect(measure(metrics.findByEmailMs, () => userDAO.findByEmail(updatedEmail))).resolves.toBeNull();
  });

  it("returns paginated users in descending created_at order for a unique jsonb filter", async () => {
    const sharedListScoresValues: ScoreSeed = {
      approaches_score: 44,
      consistency_score: 33,
      edge_case_score: 11,
      days_logged_in: [`${runId}-list-day`],
    };
    const filterScores = buildExactScores(sharedListScoresValues);
    const listUsers = [
      await seedUser(buildUserFixture(1, {
        scores: buildExactScores(sharedListScoresValues),
        email_verified: true,
        email_notifications_enabled: false,
      })),
      await seedUser(buildUserFixture(2, {
        scores: buildExactScores(sharedListScoresValues),
        email_verified: true,
        email_notifications_enabled: false,
      })),
      await seedUser(buildUserFixture(3, {
        scores: buildExactScores(sharedListScoresValues),
        email_verified: true,
        email_notifications_enabled: false,
      })),
    ];

    const pageOne = await measure(metrics.findAllMs, () => userDAO.findAll({ scores: filterScores }, 1, 2));
    expect(pageOne.pagination).toEqual({ page: 1, perPage: 2 });
    expect(pageOne.data).toHaveLength(2);
    expect(pageOne.data[0]).toBeInstanceOf(User);
    expect(pageOne.data[0]?.id).toBe(listUsers[2]?.id);
    expect(pageOne.data[1]?.id).toBe(listUsers[1]?.id);

    const pageTwo = await measure(metrics.findAllMs, () => userDAO.findAll({ scores: filterScores }, 2, 2));
    expect(pageTwo.pagination).toEqual({ page: 2, perPage: 2 });
    expect(pageTwo.data).toHaveLength(1);
    expect(pageTwo.data[0]?.id).toBe(listUsers[0]?.id);
  });

  it("round-trips user scores and merges partial updates", async () => {
    const scoreUser = await seedUser(buildUserFixture(20));

    const initialScores = await measure(metrics.getUserScoresMs, () => userDAO.getUserScores(scoreUser.id));
    expect(initialScores).toBeNull();

    const firstPatch = {
      approaches_score: 15,
      consistency_score: 25,
      edge_case_score: 35,
      days_logged_in: [`${runId}-scores-day-1`],
    };
    const firstMergedScores = await measure(metrics.setUserScoresMs, () => userDAO.setUserScores(scoreUser.id, firstPatch));
    expect(firstMergedScores).toBeInstanceOf(UserScores);
    expect(firstMergedScores).toMatchObject({
      approaches_score: 15,
      consistency_score: 25,
      edge_case_score: 35,
      total_score: 75,
      days_logged_in: [`${runId}-scores-day-1`],
    });

    const afterFirstRead = await measure(metrics.getUserScoresMs, () => userDAO.getUserScores(scoreUser.id));
    expect(afterFirstRead).toBeInstanceOf(UserScores);
    expect(afterFirstRead).toMatchObject({
      approaches_score: 15,
      consistency_score: 25,
      edge_case_score: 35,
      total_score: 75,
      days_logged_in: [`${runId}-scores-day-1`],
    });

    const secondMergedScores = await measure(metrics.setUserScoresMs, () => userDAO.setUserScores(scoreUser.id, {
      edge_case_score: 40,
    }));
    expect(secondMergedScores).toBeInstanceOf(UserScores);
    expect(secondMergedScores).toMatchObject({
      approaches_score: 15,
      consistency_score: 25,
      edge_case_score: 40,
      total_score: 80,
      days_logged_in: [`${runId}-scores-day-1`],
    });

    const afterSecondRead = await measure(metrics.getUserScoresMs, () => userDAO.getUserScores(scoreUser.id));
    expect(afterSecondRead).toBeInstanceOf(UserScores);
    expect(afterSecondRead).toMatchObject({
      approaches_score: 15,
      consistency_score: 25,
      edge_case_score: 40,
      total_score: 80,
      days_logged_in: [`${runId}-scores-day-1`],
    });
  });

  it("round-trips last_5_submissions arrays and keeps the last five entries", async () => {
    const submissionUser = await seedUser(buildUserFixture(30));
    const submissions = [
      buildShortSubmissionFixture(1),
      buildShortSubmissionFixture(2),
      buildShortSubmissionFixture(3),
      buildShortSubmissionFixture(4),
      buildShortSubmissionFixture(5),
      buildShortSubmissionFixture(6),
    ];

    const updatedProfile = await measure(metrics.setSubmissionsInProfileMs, () => userDAO.setSubmissionsInProfile(submissionUser.id, submissions));
    expect(updatedProfile).toHaveLength(6);
    expect(updatedProfile[0]).toBeInstanceOf(ShortSubmission);
    expect(updatedProfile[5]?.submission_id).toBe(submissions[5]?.submission_id);

    const refetchedUser = await measure(metrics.findByIdMs, () => userDAO.findById(submissionUser.id));
    expect(refetchedUser?.last_5_submissions).toHaveLength(6);
    expect(refetchedUser?.last_5_submissions?.[0]).toBeInstanceOf(ShortSubmission);
    expect(refetchedUser?.last_5_submissions?.[5]?.submission_id).toBe(submissions[5]?.submission_id);

    const persistedSubmissions = await measure(metrics.getUserSubmissionsMs, () => userDAO.getUserSubmissions(submissionUser.id));
    expect(persistedSubmissions).toHaveLength(6);
    expect(persistedSubmissions?.[0]).toBeInstanceOf(ShortSubmission);
    expect(persistedSubmissions?.[0]?.submission_id).toBe(submissions[0]?.submission_id);
    expect(persistedSubmissions?.[5]?.submission_id).toBe(submissions[5]?.submission_id);

    const lastFiveSubmissions = await measure(metrics.getLast5SubmissionsMs, () => userDAO.getLast5Submissions(submissionUser.id));
    expect(lastFiveSubmissions).toHaveLength(5);
    expect(lastFiveSubmissions?.[0]?.submission_id).toBe(submissions[1]?.submission_id);
    expect(lastFiveSubmissions?.[4]?.submission_id).toBe(submissions[5]?.submission_id);
  });

  it("returns null for missing reads and rejects missing writes", async () => {
    const missingUserId = randomUUID();
    const missingEmail = `${runId}.missing@example.test`;
    const missingScores = buildExactScores({
      approaches_score: 999,
      consistency_score: 998,
      edge_case_score: 997,
      days_logged_in: [`${runId}-missing-day`],
    });

    await expect(measure(metrics.findByIdMs, () => userDAO.findById(missingUserId))).resolves.toBeNull();
    await expect(measure(metrics.findByEmailMs, () => userDAO.findByEmail(missingEmail))).resolves.toBeNull();
    await expect(measure(metrics.viewProfileMs, () => userDAO.viewProfile(missingUserId))).resolves.toBeNull();
    await expect(measure(metrics.getUserScoresMs, () => userDAO.getUserScores(missingUserId))).resolves.toBeNull();
    await expect(measure(metrics.getUserSubmissionsMs, () => userDAO.getUserSubmissions(missingUserId))).resolves.toBeNull();
    await expect(measure(metrics.getLast5SubmissionsMs, () => userDAO.getLast5Submissions(missingUserId))).resolves.toBeNull();
    await expect(measure(metrics.setSubmissionsInProfileMs, () => userDAO.setSubmissionsInProfile(missingUserId, []))).rejects.toThrow("Failed to persist the update data");

    const emptyPage = await measure(metrics.findAllMs, () => userDAO.findAll({ scores: missingScores }, 1, 5));
    expect(emptyPage).toEqual({
      data: [],
      pagination: {
        page: 1,
        perPage: 5,
      },
    });

    await expect(measure(metrics.updateMs, () => userDAO.update(missingUserId, {
      first_name: "Missing",
    }))).rejects.toThrow("Couldn't persist User data update in database");
    await expect(measure(metrics.updateSelfProfileMs, () => userDAO.updateSelfProfile(missingUserId, {
      last_name: "Missing",
    }))).rejects.toThrow("Couldn't persist User data update in database");
    await expect(measure(metrics.updateUserMs, () => userDAO.updateUser(missingUserId, {
      email_notifications_enabled: false,
    }))).rejects.toThrow("Couldn't persist User data update in database");
    await expect(measure(metrics.toggleBanUserMs, () => userDAO.toggleBanUser(missingUserId, true))).rejects.toThrow("Failed to persist update change");
    await expect(measure(metrics.unbanUserMs, () => userDAO.unbanUser(missingUserId))).rejects.toThrow("Failed to persist update change");
    await expect(measure(metrics.toggleEmailNotificationsMs, () => userDAO.toggleEmailNotifications(missingUserId, false))).rejects.toThrow("Unable to persist the update data");
    await expect(measure(metrics.setUserScoresMs, () => userDAO.setUserScores(missingUserId, {
      approaches_score: 1,
    }))).rejects.toThrow("Failed to persist the update data");
    await expect(measure(metrics.deleteMs, () => userDAO.delete(missingUserId))).rejects.toThrow("Couldn't persist the delete operation");
  });
});

