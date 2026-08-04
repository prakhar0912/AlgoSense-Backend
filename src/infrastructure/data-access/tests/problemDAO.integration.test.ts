import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import Problem from "../../../entities/problem.js";
import client, { pool } from "../client.js";
import ProblemDAO from "../problemDAO.js";

type TimingMetrics = {
  setupMs: number;
  seedMs: number;
  cleanupMs: number;
  createMs: number[];
  findByIdMs: number[];
  findByNameMs: number[];
  listMs: number[];
  updateMs: number[];
  deleteMs: number[];
};

type ProblemApproach = Problem["approaches"][number];
type ProblemInsertPayload = Omit<Problem, "id">;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const suiteStartMs = performance.now();
const runId = `problemdao-${Date.now()}-${randomUUID().slice(0, 8)}`;
const problemDAO = new ProblemDAO(client);

const metrics: TimingMetrics = {
  setupMs: 0,
  seedMs: 0,
  cleanupMs: 0,
  createMs: [],
  findByIdMs: [],
  findByNameMs: [],
  listMs: [],
  updateMs: [],
  deleteMs: [],
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

async function measure<T>(bucket: number[], action: () => Promise<T>): Promise<T> {
  const startedMs = performance.now();

  try {
    return await action();
  }
  finally {
    bucket.push(performance.now() - startedMs);
  }
}

function buildApproach(index: number, overrides: Partial<ProblemApproach> = {}): ProblemApproach {
  return {
    type: `${runId}-approach-${index}`,
    primary_technique: `technique-${index}`,
    time_complexity: "O(n)",
    space_complexity: "O(1)",
    req_or_constraints: `constraint-${index}`,
    steps: [`step-${index}-1`, `step-${index}-2`],
    explanation: `explanation-${index}`,
    edge_cases: [
      {
        case: `edge-${index}-1`,
        importance: "high",
      },
    ],
    ...overrides,
  };
}

function buildProblemInput(label: string, difficulty: Problem["difficulty"] = "medium"): ProblemInsertPayload {
  return {
    title: `${runId}-${label}`,
    description: `${runId} description for ${label} with enough detail to be valid.`,
    rating: label.length + 4.5,
    slug: `${runId}-${label}-slug`,
    hints: [`${label}-hint-1`, `${label}-hint-2`],
    primary_topics: [label, "hashTable"],
    secondary_topics: ["array", "sorting"],
    difficulty,
    approaches: [buildApproach(1, {
      type: `${runId}-${label}-approach`,
    })],
    evaluation_criteria: [
      `${label}-correctness`,
      `${label}-efficiency`,
    ],
  };
}

async function seedProblem(input: ProblemInsertPayload): Promise<Problem> {
  const seedStartedMs = performance.now();

  try {
    const createdProblem = await measure(metrics.createMs, () => problemDAO.create(input));
    createdFixturesTotal += 1;
    createdFixturesInCurrentTest += 1;
    return createdProblem;
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

  console.info(
    `[ProblemDAO integration] setup=${metrics.setupMs.toFixed(5)} ms seed=${metrics.seedMs.toFixed(5)} ms cleanup=${metrics.cleanupMs.toFixed(5)} ms created=${createdFixturesTotal} cleaned=${cleanedFixturesTotal} total=${totalRuntimeMs.toFixed(5)} ms`,
  );
  console.info(
    `[ProblemDAO integration] create=${formatAverage(metrics.createMs)} findById=${formatAverage(metrics.findByIdMs)} findByName=${formatAverage(metrics.findByNameMs)} list=${formatAverage(metrics.listMs)} update=${formatAverage(metrics.updateMs)} delete=${formatAverage(metrics.deleteMs)}`,
  );

  client.release();
  await pool.end();
});

describe("ProblemDAO integration", () => {
  it("round-trips create, find, list, update, and delete against PostgreSQL", async () => {
    const alphaInput = buildProblemInput("alpha");
    const muInput = buildProblemInput("mu");
    const zetaInput = buildProblemInput("zeta");

    const alpha = await seedProblem(alphaInput);
    const mu = await seedProblem(muInput);
    const zeta = await seedProblem(zetaInput);

    expect(alpha).toBeInstanceOf(Problem);
    expect(mu).toBeInstanceOf(Problem);
    expect(zeta).toBeInstanceOf(Problem);
    expect(alpha.id).toMatch(UUID_PATTERN);
    expect(mu.id).toMatch(UUID_PATTERN);
    expect(zeta.id).toMatch(UUID_PATTERN);
    expect(alpha.title).toBe(alphaInput.title);
    expect(mu.title).toBe(muInput.title);
    expect(zeta.title).toBe(zetaInput.title);
    expect(alpha.rating).toBe(alphaInput.rating);
    expect(alpha.slug).toBe(alphaInput.slug);
    expect(alpha.hints).toEqual(alphaInput.hints);
    expect(alpha.primary_topics).toEqual(alphaInput.primary_topics);
    expect(alpha.secondary_topics).toEqual(alphaInput.secondary_topics);
    expect(alpha.approaches).toEqual(alphaInput.approaches);
    expect(alpha.evaluation_criteria).toEqual(alphaInput.evaluation_criteria);

    const lookedUpAlpha = await measure(metrics.findByIdMs, () => problemDAO.findById(alpha.id));
    expect(lookedUpAlpha).toBeInstanceOf(Problem);
    expect(lookedUpAlpha).toMatchObject({
      id: alpha.id,
      title: alphaInput.title,
      description: alphaInput.description,
      rating: alphaInput.rating,
      slug: alphaInput.slug,
      hints: alphaInput.hints,
      primary_topics: alphaInput.primary_topics,
      secondary_topics: alphaInput.secondary_topics,
      difficulty: alphaInput.difficulty,
      evaluation_criteria: alphaInput.evaluation_criteria,
    });
    expect(lookedUpAlpha?.approaches).toEqual(alphaInput.approaches);

    const lookedUpByName = await measure(metrics.findByNameMs, () => problemDAO.findByName(muInput.title));
    expect(lookedUpByName).toBeInstanceOf(Problem);
    expect(lookedUpByName?.id).toBe(mu.id);

    const pageOne = await measure(metrics.listMs, () => problemDAO.list({ difficulty: "medium" }, 1, 2));
    expect(pageOne.pagination).toEqual({ page: 1, perPage: 2 });
    expect(pageOne.data).toHaveLength(2);
    expect(pageOne.data[0]?.title).toBe(alphaInput.title);
    expect(pageOne.data[1]?.title).toBe(muInput.title);

    const pageTwo = await measure(metrics.listMs, () => problemDAO.list({ difficulty: "medium" }, 2, 2));
    expect(pageTwo.pagination).toEqual({ page: 2, perPage: 2 });
    expect(pageTwo.data).toHaveLength(1);
    expect(pageTwo.data[0]?.title).toBe(zetaInput.title);

    const updatedTitle = `${runId}-mu-updated`;
    const updatedDescription = `${runId} updated description for mu that stays valid.`;
    const updatedInput: Partial<Problem> = {
      id: "spoofed-id",
      title: updatedTitle,
      description: updatedDescription,
      rating: 9.25,
      slug: `${runId}-mu-updated-slug`,
      hints: ["updated-hint-1", "updated-hint-2"],
      primary_topics: ["graph", "hashTable"],
      secondary_topics: ["dynamicProgramming"],
      difficulty: "hard",
      approaches: [
        buildApproach(2, {
          type: `${runId}-mu-updated-approach`,
          primary_technique: "lookup table",
          time_complexity: "O(n)",
          space_complexity: "O(n)",
          req_or_constraints: "Array input",
          steps: ["Build map", "Scan values"],
          explanation: "Store seen values and check complements.",
          edge_cases: [
            {
              case: "duplicates",
              importance: "critical",
            },
          ],
        }),
      ],
      evaluation_criteria: [
        "updated-correctness",
        "updated-efficiency",
      ],
    };

    const updatedMu = await measure(metrics.updateMs, () => problemDAO.update(mu.id, updatedInput));
    expect(updatedMu).toBeInstanceOf(Problem);
    expect(updatedMu.id).toBe(mu.id);
    expect(updatedMu.title).toBe(updatedTitle);
    expect(updatedMu.description).toBe(updatedDescription);
    expect(updatedMu.rating).toBe(9.25);
    expect(updatedMu.slug).toBe(`${runId}-mu-updated-slug`);
    expect(updatedMu.hints).toEqual(["updated-hint-1", "updated-hint-2"]);
    expect(updatedMu.primary_topics).toEqual(["graph", "hashTable"]);
    expect(updatedMu.secondary_topics).toEqual(["dynamicProgramming"]);
    expect(updatedMu.difficulty).toBe("hard");
    expect(updatedMu.approaches).toEqual(updatedInput.approaches);

    await expect(measure(metrics.findByNameMs, () => problemDAO.findByName(muInput.title))).resolves.toBeNull();
    const lookedUpUpdatedName = await measure(metrics.findByNameMs, () => problemDAO.findByName(updatedTitle));
    expect(lookedUpUpdatedName).toBeInstanceOf(Problem);
    expect(lookedUpUpdatedName?.id).toBe(mu.id);
    expect(lookedUpUpdatedName?.title).toBe(updatedTitle);

    const deleted = await measure(metrics.deleteMs, () => problemDAO.delete(alpha.id));
    expect(deleted).toBe(true);
    await expect(measure(metrics.findByIdMs, () => problemDAO.findById(alpha.id))).resolves.toBeNull();
  });

  it("returns null, empty pages, false deletes, and write failures for missing problems", async () => {
    const missingProblemId = randomUUID();
    const missingProblemName = `${runId}-missing`;

    await expect(measure(metrics.findByIdMs, () => problemDAO.findById(missingProblemId))).resolves.toBeNull();
    await expect(measure(metrics.findByNameMs, () => problemDAO.findByName(missingProblemName))).resolves.toBeNull();

    const emptyPage = await measure(metrics.listMs, () => problemDAO.list({ title: missingProblemName }, 1, 5));
    expect(emptyPage).toEqual({
      data: [],
      pagination: {
        page: 1,
        perPage: 5,
      },
    });

    await expect(measure(metrics.deleteMs, () => problemDAO.delete(missingProblemId))).resolves.toBe(false);
    await expect(measure(metrics.updateMs, () => problemDAO.update(missingProblemId, {
      title: `${runId}-ghost`,
    }))).rejects.toThrow("Couldn't persist Problem data update in database");
  });
});
