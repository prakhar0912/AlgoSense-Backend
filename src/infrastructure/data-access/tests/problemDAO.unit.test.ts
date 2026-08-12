import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import type { PoolClient, QueryResultRow } from "pg"

import Problem from "../../../entities/problem.js"

const mockedClient = {
  query: jest.fn(),
  release: jest.fn(),
}

await jest.unstable_mockModule("../client.js", () => ({
  default: mockedClient,
}))

const { default: ProblemDAO } = await import("../problemDAO.js")

type DbClient = Pick<PoolClient, "query">

type ProblemApproach = Problem["approaches"][number]

type ProblemRow = QueryResultRow & {
  id: string
  title: string
  description: string
  rating: number | string
  slug: string
  hints: unknown
  primary_topics: unknown
  secondary_topics: unknown
  similar_problems: unknown
  difficulty: number | string
  approaches: unknown
  evaluation_criteria: unknown
}

type PublicProblem = Omit<Problem, "hints" | "evaluation_criteria" | "approaches">

type PublicProblemRow = QueryResultRow & {
  id: string
  title: string
  description: string
  rating: number | string
  slug: string
  primary_topics: unknown
  secondary_topics: unknown
  similar_problems: unknown
  difficulty: number | string
}

type ProblemInsertPayload = Omit<Problem, "id">

function buildApproach(overrides: Partial<ProblemApproach> = {}): ProblemApproach {
  return {
    type: "two pointers",
    primary_technique: "sliding window",
    time_complexity: "O(n)",
    space_complexity: "O(1)",
    req_or_constraints: "Array input",
    steps: ["Initialize pointers", "Move pointers toward each other"],
    explanation: "A linear scan with two moving pointers.",
    edge_cases: [{ case: "empty array", importance: "critical" }],
    ...overrides,
  }
}

function buildProblemRow(overrides: Partial<ProblemRow> = {}): ProblemRow {
  return {
    id: "problem-123",
    title: "Two Sum",
    description: "Find two numbers that add up to a target value.",
    rating: 4.5,
    slug: "two-sum",
    hints: ["Try using a map"],
    primary_topics: ["hashTable"],
    secondary_topics: ["array"],
    similar_problems: ["three-sum", "four-sum"],
    difficulty: "medium",
    approaches: [buildApproach()],
    evaluation_criteria: ["Correctness"],
    ...overrides,
  }
}

function buildProblem(overrides: Partial<Problem> = {}): Problem {
  return Object.assign(new Problem(), {
    id: "problem-123",
    title: "Two Sum",
    description: "Find two numbers that add up to a target value.",
    rating: 4.5,
    slug: "two-sum",
    hints: ["Try using a map"],
    primary_topics: ["hashTable"],
    secondary_topics: ["array"],
    similar_problems: ["three-sum", "four-sum"],
    difficulty: "medium" as const,
    approaches: [buildApproach()],
    evaluation_criteria: ["Correctness"],
    ...overrides,
  })
}

function buildPublicProblem(overrides: Partial<PublicProblem> = {}): PublicProblem {
  return {
    id: "problem-123",
    title: "Two Sum",
    description: "Find two numbers that add up to a target value.",
    rating: 4.5,
    slug: "two-sum",
    primary_topics: ["hashTable"],
    secondary_topics: ["array"],
    similar_problems: ["three-sum", "four-sum"],
    difficulty: "medium",
    ...overrides,
  }
}

function buildPublicProblemRow(overrides: Partial<PublicProblemRow> = {}): PublicProblemRow {
  return {
    id: "problem-123",
    title: "Two Sum",
    description: "Find two numbers that add up to a target value.",
    rating: 4.5,
    slug: "two-sum",
    primary_topics: ["hashTable"],
    secondary_topics: ["array"],
    similar_problems: ["three-sum", "four-sum"],
    difficulty: "medium",
    ...overrides,
  }
}

describe("ProblemDAO unit", () => {
  let query: jest.MockedFunction<DbClient["query"]>
  let db: DbClient
  let dao: ProblemDAO

  beforeEach(() => {
    query = jest.fn() as jest.MockedFunction<DbClient["query"]>
    db = { query }
    dao = new ProblemDAO(db)
    mockedClient.query.mockReset()
    mockedClient.release.mockReset()
  })

  it("creates a problem without supplying an id column and returns the persisted entity", async () => {
    const payload: ProblemInsertPayload = {
      title: "Two Sum",
      description: "Find two numbers that add up to a target value.",
      rating: 4.5,
      slug: "two-sum",
      hints: ["Try using a map"],
      primary_topics: ["hashTable"],
      secondary_topics: ["array"],
      similar_problems: ["three-sum", "four-sum"],
      difficulty: "medium",
      approaches: [buildApproach()],
      evaluation_criteria: ["Correctness"],
    }
    const persistedRow = buildProblemRow()

    query.mockResolvedValueOnce({
      rows: [persistedRow],
      rowCount: 1,
    } as never)

    const result = await dao.create(payload)

    expect(query).toHaveBeenCalledTimes(1)
    const call = query.mock.calls[0]
    if (!call) {
      throw new Error("Expected the DAO to issue one insert query")
    }

    const [sql, params] = call
    expect(sql).toContain("INSERT INTO problems")
    expect(sql).toContain("similar_problems")
    expect(sql).toContain("difficulty_enum")
    expect(sql).toContain("jsonb[]")
    expect(sql).toContain("varchar[]")
    expect(params).toEqual([
      payload.title,
      payload.description,
      payload.rating,
      payload.slug,
      payload.hints,
      payload.primary_topics,
      payload.secondary_topics,
      payload.similar_problems,
      payload.difficulty,
      payload.approaches,
      payload.evaluation_criteria,
    ])
    expect(result).toEqual(buildProblem())
  })

  it("defaults similar_problems to an empty array when omitted", async () => {
    const payload: Partial<Problem> = {
      title: "Two Sum",
      description: "Find two numbers that add up to a target value.",
      rating: 4.5,
      slug: "two-sum",
      hints: ["Try using a map"],
      primary_topics: ["hashTable"],
      secondary_topics: ["array"],
      difficulty: "medium",
      approaches: [buildApproach()],
      evaluation_criteria: ["Correctness"],
    }
    const persistedRow = buildProblemRow({
      similar_problems: [],
    })

    query.mockResolvedValueOnce({
      rows: [persistedRow],
      rowCount: 1,
    } as never)

    const result = await dao.create(payload)

    expect(query).toHaveBeenCalledTimes(1)
    const call = query.mock.calls[0]
    if (!call) {
      throw new Error("Expected the DAO to issue one insert query")
    }

    const [sql, params] = call
    expect(sql).toContain("similar_problems")
    expect(params).toEqual([
      payload.title,
      payload.description,
      payload.rating,
      payload.slug,
      payload.hints,
      payload.primary_topics,
      payload.secondary_topics,
      [],
      payload.difficulty,
      payload.approaches,
      payload.evaluation_criteria,
    ])
    expect(result).toEqual(buildProblem({
      similar_problems: [],
    }))
  })

  it("propagates raw database errors from create", async () => {
    const payload: ProblemInsertPayload = {
      title: "Two Sum",
      description: "Find two numbers that add up to a target value.",
      rating: 4.5,
      slug: "two-sum",
      hints: ["Try using a map"],
      primary_topics: ["hashTable"],
      secondary_topics: ["array"],
      similar_problems: ["three-sum", "four-sum"],
      difficulty: "medium",
      approaches: [buildApproach()],
      evaluation_criteria: ["Correctness"],
    }
    const originalError = new Error("database unavailable")

    query.mockRejectedValueOnce(originalError)

    await expect(dao.create(payload)).rejects.toBe(originalError)
  })

  it("returns null for missing read lookups", async () => {
    query.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never)

    await expect(dao.findById("missing-problem")).resolves.toBeNull()

    query.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never)

    await expect(dao.findByName("missing-problem")).resolves.toBeNull()
  })

  it("returns public problem projections without selecting hidden columns", async () => {
    const firstRow = buildPublicProblemRow({
      id: "problem-1",
      title: "Alpha",
      slug: "alpha",
      similar_problems: ["alpha-similar-1", "alpha-similar-2"],
    })
    const secondRow = buildPublicProblemRow({
      id: "problem-2",
      title: "Beta",
      slug: "beta",
      similar_problems: ["beta-similar-1", "beta-similar-2"],
    })

    query.mockResolvedValueOnce({
      rows: [secondRow, firstRow],
      rowCount: 2,
    } as never)

    const result = await dao.listForUser({
      difficulty: "medium",
      slug: "alpha",
      similar_problems: ["alpha-similar-1", "alpha-similar-2"],
    })

    expect(query).toHaveBeenCalledTimes(1)
    const call = query.mock.calls[0]
    if (!call) {
      throw new Error("Expected the DAO to issue one public list query")
    }

    const [sql, params] = call
    expect(sql).toContain("SELECT id, title, description, rating, slug, primary_topics, secondary_topics, similar_problems, difficulty")
    expect(sql).toContain("FROM problems")
    expect(sql).not.toContain("hints")
    expect(sql).not.toContain("approaches")
    expect(sql).not.toContain("evaluation_criteria")
    expect(sql).toContain("difficulty IS NOT DISTINCT FROM $1::difficulty_enum")
    expect(sql).toContain("slug IS NOT DISTINCT FROM $2")
    expect(sql).toContain("similar_problems IS NOT DISTINCT FROM $3::varchar[]")
    expect(sql).toContain("LIMIT $4")
    expect(sql).toContain("OFFSET $5")
    expect(params).toEqual([
      "medium",
      "alpha",
      ["alpha-similar-1", "alpha-similar-2"],
      10,
      0,
    ])
    expect(result).toEqual({
      data: [
        buildPublicProblem({
          id: "problem-2",
          title: "Beta",
          slug: "beta",
          similar_problems: ["beta-similar-1", "beta-similar-2"],
        }),
        buildPublicProblem({
          id: "problem-1",
          title: "Alpha",
          slug: "alpha",
          similar_problems: ["alpha-similar-1", "alpha-similar-2"],
        }),
      ],
      pagination: {
        page: 1,
        perPage: 10,
      },
    })
    expect(result.data[0]).not.toHaveProperty("hints")
    expect(result.data[0]).not.toHaveProperty("approaches")
    expect(result.data[0]).not.toHaveProperty("evaluation_criteria")
  })

  it("returns a public problem by id and null when the row is missing", async () => {
    const row = buildPublicProblemRow({
      id: "problem-456",
      title: "Public Alpha",
      slug: "public-alpha",
    })

    query.mockResolvedValueOnce({
      rows: [row],
      rowCount: 1,
    } as never)

    const result = await dao.findByIdForUsers("problem-456")

    expect(query).toHaveBeenCalledTimes(1)
    const call = query.mock.calls[0]
    if (!call) {
      throw new Error("Expected the DAO to issue one public id query")
    }

    const [sql, params] = call
    expect(sql).toContain("SELECT id, title, description, rating, slug, primary_topics, secondary_topics, similar_problems, difficulty FROM problems WHERE id = $1 LIMIT 1")
    expect(params).toEqual(["problem-456"])
    expect(result).toEqual(buildPublicProblem({
      id: "problem-456",
      title: "Public Alpha",
      slug: "public-alpha",
    }))
    expect(result).not.toHaveProperty("hints")
    expect(result).not.toHaveProperty("approaches")
    expect(result).not.toHaveProperty("evaluation_criteria")

    query.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never)

    await expect(dao.findByIdForUsers("missing-problem")).resolves.toBeNull()
  })

  it("returns a public problem by slug for user views and null when the row is missing", async () => {
    const row = buildPublicProblemRow({
      id: "problem-789",
      title: "Public Beta",
      slug: "public-beta",
    })

    query.mockResolvedValueOnce({
      rows: [row],
      rowCount: 1,
    } as never)

    const result = await dao.findBySlugForUsers("public-beta")

    expect(query).toHaveBeenCalledTimes(1)
    const call = query.mock.calls[0]
    if (!call) {
      throw new Error("Expected the DAO to issue one public slug query")
    }

    const [sql, params] = call
    expect(sql).toContain("SELECT id, title, description, rating, slug, primary_topics, secondary_topics, similar_problems, difficulty FROM problems WHERE slug = $1 LIMIT 1")
    expect(params).toEqual(["public-beta"])
    expect(result).toEqual(buildPublicProblem({
      id: "problem-789",
      title: "Public Beta",
      slug: "public-beta",
    }))
    expect(result).not.toHaveProperty("hints")
    expect(result).not.toHaveProperty("approaches")
    expect(result).not.toHaveProperty("evaluation_criteria")

    query.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never)

    await expect(dao.findBySlugForUsers("missing-slug")).resolves.toBeNull()
  })

  it("returns a public problem by slug with the same public projection as the user lookup", async () => {
    const row = buildPublicProblemRow({
      id: "problem-321",
      title: "Public Gamma",
      slug: "public-gamma",
    })

    query.mockResolvedValueOnce({
      rows: [row],
      rowCount: 1,
    } as never)

    const result = await dao.findBySlug("public-gamma")

    expect(query).toHaveBeenCalledTimes(1)
    const call = query.mock.calls[0]
    if (!call) {
      throw new Error("Expected the DAO to issue one slug query")
    }

    const [sql, params] = call
    expect(sql).toContain("SELECT id, title, description, rating, slug, primary_topics, secondary_topics, similar_problems, difficulty FROM problems WHERE slug = $1 LIMIT 1")
    expect(params).toEqual(["public-gamma"])
    expect(result).toEqual(buildPublicProblem({
      id: "problem-321",
      title: "Public Gamma",
      slug: "public-gamma",
    }))
    expect(result).not.toHaveProperty("hints")
    expect(result).not.toHaveProperty("approaches")
    expect(result).not.toHaveProperty("evaluation_criteria")

    query.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never)

    await expect(dao.findBySlug("missing-slug")).resolves.toBeNull()
  })

  it("returns a paginated payload for filtered problems", async () => {
    const firstRow = buildProblemRow({
      id: "problem-1",
      title: "Alpha",
      slug: "alpha",
      similar_problems: ["alpha-similar-1", "alpha-similar-2"],
    })
    const secondRow = buildProblemRow({
      id: "problem-2",
      title: "Beta",
      slug: "beta",
      similar_problems: ["beta-similar-1", "beta-similar-2"],
    })

    query.mockResolvedValueOnce({
      rows: [secondRow, firstRow],
      rowCount: 2,
    } as never)

    const result = await dao.list({
      difficulty: "medium",
      slug: "alpha",
      similar_problems: ["alpha-similar-1", "alpha-similar-2"],
    }, 3, 25)

    expect(query).toHaveBeenCalledTimes(1)
    const call = query.mock.calls[0]
    if (!call) {
      throw new Error("Expected the DAO to issue one list query")
    }

    const [sql, params] = call
    expect(sql).toContain("FROM problems")
    expect(sql).toContain("difficulty IS NOT DISTINCT FROM $1::difficulty_enum")
    expect(sql).toContain("slug IS NOT DISTINCT FROM $2")
    expect(sql).toContain("similar_problems IS NOT DISTINCT FROM $3::varchar[]")
    expect(params).toEqual([
      "medium",
      "alpha",
      ["alpha-similar-1", "alpha-similar-2"],
      25,
      50,
    ])
    expect(result).toEqual({
      data: [
        buildProblem({
          id: "problem-2",
          title: "Beta",
          slug: "beta",
          similar_problems: ["beta-similar-1", "beta-similar-2"],
        }),
        buildProblem({
          id: "problem-1",
          title: "Alpha",
          slug: "alpha",
          similar_problems: ["alpha-similar-1", "alpha-similar-2"],
        }),
      ],
      pagination: {
        page: 3,
        perPage: 25,
      },
    })
  })

  it("updates a problem, ignores id in the payload, and throws when no row is persisted", async () => {
    const approaches = [buildApproach({
      type: "hash map",
      primary_technique: "lookup table",
      time_complexity: "O(n)",
      space_complexity: "O(n)",
      req_or_constraints: "Array input",
      steps: ["Build map", "Scan array"],
      explanation: "Store values and check complements.",
      edge_cases: [{ case: "duplicates", importance: "high" }],
    })]
    const payload: Partial<Problem> = {
      id: "spoofed-problem-id",
      title: "Two Sum Updated",
      description: "Updated description with enough detail.",
      rating: 7.25,
      slug: "two-sum-updated",
      hints: ["Remember complements"],
      primary_topics: ["hashTable"],
      secondary_topics: ["array"],
      similar_problems: ["three-sum", "four-sum"],
      difficulty: "hard",
      approaches,
      evaluation_criteria: ["Correctness", "Efficiency"],
    }
    const updatedRow = buildProblemRow({
      id: "problem-123",
      title: "Two Sum Updated",
      description: "Updated description with enough detail.",
      rating: 7.25,
      slug: "two-sum-updated",
      hints: ["Remember complements"],
      primary_topics: ["hashTable"],
      secondary_topics: ["array"],
      similar_problems: ["three-sum", "four-sum"],
      difficulty: "hard",
      approaches,
      evaluation_criteria: ["Correctness", "Efficiency"],
    })

    query.mockResolvedValueOnce({
      rows: [updatedRow],
      rowCount: 1,
    } as never)

    const result = await dao.update("problem-123", payload)

    expect(query).toHaveBeenCalledTimes(1)
    const call = query.mock.calls[0]
    if (!call) {
      throw new Error("Expected the DAO to issue one update query")
    }

    const [sql, params] = call
    expect(sql).toContain("UPDATE problems")
    expect(sql).toContain("rating = $3::double precision")
    expect(sql).toContain("slug = $4")
    expect(sql).toContain("hints = $5::varchar[]")
    expect(sql).toContain("primary_topics = $6::varchar[]")
    expect(sql).toContain("secondary_topics = $7::varchar[]")
    expect(sql).toContain("similar_problems = $8::varchar[]")
    expect(sql).toContain("difficulty = $9::difficulty_enum")
    expect(sql).toContain("approaches = $10::jsonb[]")
    expect(sql).toContain("evaluation_criteria = $11::varchar[]")
    expect(params).toEqual([
      payload.title,
      payload.description,
      payload.rating,
      payload.slug,
      payload.hints,
      payload.primary_topics,
      payload.secondary_topics,
      payload.similar_problems,
      payload.difficulty,
      payload.approaches,
      payload.evaluation_criteria,
      "problem-123",
    ])
    expect(result).toEqual(buildProblem({
      id: "problem-123",
      title: "Two Sum Updated",
      description: "Updated description with enough detail.",
      rating: 7.25,
      slug: "two-sum-updated",
      hints: ["Remember complements"],
      primary_topics: ["hashTable"],
      secondary_topics: ["array"],
      similar_problems: ["three-sum", "four-sum"],
      difficulty: "hard",
      approaches,
      evaluation_criteria: ["Correctness", "Efficiency"],
    }))

    query.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never)

    await expect(dao.update("missing-problem", {
      title: "Missing",
      similar_problems: ["ghost-problem"],
    })).rejects.toThrow("Couldn't persist Problem data update in database")
  })

  it("returns explicit booleans from delete", async () => {
    query
      .mockResolvedValueOnce({
        rows: [{ id: "problem-123" }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as never)

    await expect(dao.delete("problem-123")).resolves.toBe(true)
    await expect(dao.delete("missing-problem")).resolves.toBe(false)
  })
})
