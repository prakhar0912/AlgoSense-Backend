import client from "./client.js"
import type { PoolClient, QueryResultRow } from "pg"

import Problem from "../../entities/problem.js"
import type IPaginated from "../../interfaces/paginated.js"
import type IProblemDAO from "../../interfaces/problem/problemDAO.js"

type DbClient = Pick<PoolClient, "query">

type ProblemApproach = Problem["approaches"][number]
type ProblemApproachEdgeCases = NonNullable<ProblemApproach["edge_cases"]>
type ProblemApproachEdgeCase = ProblemApproachEdgeCases[number]

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

type PublicFilterableProblemColumn = keyof Pick<
  Problem,
  | "id"
  | "title"
  | "description"
  | "rating"
  | "slug"
  | "primary_topics"
  | "secondary_topics"
  | "similar_problems"
  | "difficulty"
>

type FilterableProblemColumn = keyof Pick<
  Problem,
  | "id"
  | "title"
  | "description"
  | "rating"
  | "slug"
  | "hints"
  | "primary_topics"
  | "secondary_topics"
  | "similar_problems"
  | "difficulty"
  | "approaches"
  | "evaluation_criteria"
>

type UpdatableProblemColumn = keyof Pick<
  Problem,
  | "title"
  | "description"
  | "rating"
  | "slug"
  | "hints"
  | "primary_topics"
  | "secondary_topics"
  | "similar_problems"
  | "difficulty"
  | "approaches"
  | "evaluation_criteria"
>

const PROBLEM_COLUMNS = [
  "id",
  "title",
  "description",
  "rating",
  "slug",
  "hints",
  "primary_topics",
  "secondary_topics",
  "similar_problems",
  "difficulty",
  "approaches",
  "evaluation_criteria",
] as const

const PUBLIC_PROBLEM_COLUMNS = [
  "id",
  "title",
  "description",
  "rating",
  "slug",
  "primary_topics",
  "secondary_topics",
  "similar_problems",
  "difficulty",
] as const

const FILTERABLE_COLUMNS: ReadonlyMap<FilterableProblemColumn, string> = new Map([
  ["id", "id"],
  ["title", "title"],
  ["description", "description"],
  ["rating", "rating"],
  ["slug", "slug"],
  ["hints", "hints"],
  ["primary_topics", "primary_topics"],
  ["secondary_topics", "secondary_topics"],
  ["similar_problems", "similar_problems"],
  ["difficulty", "difficulty"],
  ["approaches", "approaches"],
  ["evaluation_criteria", "evaluation_criteria"],
])

const PUBLIC_FILTERABLE_COLUMNS: ReadonlyMap<PublicFilterableProblemColumn, string> = new Map([
  ["id", "id"],
  ["title", "title"],
  ["description", "description"],
  ["rating", "rating"],
  ["slug", "slug"],
  ["primary_topics", "primary_topics"],
  ["secondary_topics", "secondary_topics"],
  ["similar_problems", "similar_problems"],
  ["difficulty", "difficulty"],
])

const UPDATABLE_COLUMNS: ReadonlyMap<UpdatableProblemColumn, string> = new Map([
  ["title", "title"],
  ["description", "description"],
  ["rating", "rating"],
  ["slug", "slug"],
  ["hints", "hints"],
  ["primary_topics", "primary_topics"],
  ["secondary_topics", "secondary_topics"],
  ["similar_problems", "similar_problems"],
  ["difficulty", "difficulty"],
  ["approaches", "approaches"],
  ["evaluation_criteria", "evaluation_criteria"],
])

function buildSelectColumns(): string {
  return PROBLEM_COLUMNS.join(", ")
}

function buildPublicSelectColumns(): string {
  return PUBLIC_PROBLEM_COLUMNS.join(", ")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function toStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim().length > 0 ? [value] : []
  }

  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === "string")
}

function toDifficulty(value: unknown): Problem["difficulty"] {
  const normalized = typeof value === "string" ? value.trim() : String(value)

  if (normalized === "easy" || normalized === "1" || normalized === "1.0") {
    return "easy"
  }

  if (normalized === "medium" || normalized === "2.5") {
    return "medium"
  }

  if (normalized === "hard" || normalized === "6") {
    return "hard"
  }

  if (normalized === "expert" || normalized === "7") {
    return "expert"
  }

  return "easy"
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string") {
    return null
  }

  try {
    const parsed = JSON.parse(value) as unknown
    return isRecord(parsed) ? parsed : null
  }
  catch {
    return null
  }
}

function toEdgeCaseImportance(value: unknown): ProblemApproachEdgeCase["importance"] {
  if (value === "critical" || value === "high" || value === "medium" || value === "low") {
    return value
  }

  return "low"
}

function normalizeApproachEdgeCases(value: unknown): ProblemApproachEdgeCases {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      const raw = isRecord(item) ? item : parseJsonRecord(item)
      if (!raw) {
        return null
      }

      const description = typeof raw.case === "string"
        ? raw.case
        : typeof raw.description === "string"
          ? raw.description
          : ""

      return {
        case: description,
        importance: toEdgeCaseImportance(raw.importance),
      }
    })
    .filter((item): item is ProblemApproachEdgeCase => item !== null)
}

function normalizeApproach(value: unknown): ProblemApproach | null {
  const rawValue = isRecord(value) ? value : parseJsonRecord(value)

  if (!rawValue) {
    return null
  }

  return {
    type: typeof rawValue.type === "string" ? rawValue.type : "",
    primary_technique: typeof rawValue.primary_technique === "string" ? rawValue.primary_technique : undefined,
    time_complexity: typeof rawValue.time_complexity === "string" ? rawValue.time_complexity : "",
    space_complexity: typeof rawValue.space_complexity === "string" ? rawValue.space_complexity : "",
    req_or_constraints: typeof rawValue.req_or_constraints === "string" ? rawValue.req_or_constraints : "",
    steps: toStringArray(rawValue.steps),
    explanation: typeof rawValue.explanation === "string" ? rawValue.explanation : "",
    edge_cases: normalizeApproachEdgeCases(rawValue.edge_cases),
  }
}

function toApproachArray(value: unknown): Problem["approaches"] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => normalizeApproach(item)).filter((item): item is ProblemApproach => item !== null)
}

function normalizeProblemRow(row: ProblemRow): Problem {
  const problem = new Problem()

  problem.id = row.id
  problem.title = row.title
  problem.description = row.description
  problem.rating = toFiniteNumber(row.rating)
  problem.slug = row.slug
  problem.hints = toStringArray(row.hints)
  problem.primary_topics = toStringArray(row.primary_topics)
  problem.secondary_topics = toStringArray(row.secondary_topics)
  problem.similar_problems = toStringArray(row.similar_problems)
  problem.difficulty = toDifficulty(row.difficulty)
  problem.approaches = toApproachArray(row.approaches)
  problem.evaluation_criteria = toStringArray(row.evaluation_criteria)

  return problem
}

function normalizePublicProblemRow(row: PublicProblemRow): Problem {
  const problem = new Problem()

  problem.id = row.id
  problem.title = row.title
  problem.description = row.description
  problem.rating = toFiniteNumber(row.rating)
  problem.slug = row.slug
  problem.primary_topics = toStringArray(row.primary_topics)
  problem.secondary_topics = toStringArray(row.secondary_topics)
  problem.similar_problems = toStringArray(row.similar_problems)
  problem.difficulty = toDifficulty(row.difficulty)

  Reflect.deleteProperty(problem, "hints")
  Reflect.deleteProperty(problem, "approaches")
  Reflect.deleteProperty(problem, "evaluation_criteria")

  return problem
}

function toDifficultyValue(value: unknown): Problem["difficulty"] {
  return toDifficulty(value)
}

function buildProblemValueClause(column: keyof Problem, placeholder: string): string {
  if (column === "rating") {
    return `${placeholder}::double precision`
  }

  if (column === "difficulty") {
    return `${placeholder}::difficulty_enum`
  }

  if (column === "approaches") {
    return `${placeholder}::jsonb[]`
  }

  if (
    column === "hints"
    || column === "primary_topics"
    || column === "secondary_topics"
    || column === "similar_problems"
    || column === "evaluation_criteria"
  ) {
    return `${placeholder}::varchar[]`
  }

  return placeholder
}

function buildPublicFilterClause(filters: Partial<PublicProblem>): { whereClause: string; params: unknown[] } {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filters === undefined || filters === null) {
    return {
      whereClause: "",
      params: [],
    }
  }

  for (const [rawKey, rawValue] of Object.entries(filters)) {
    if (rawValue === undefined) {
      continue
    }

    if (!PUBLIC_FILTERABLE_COLUMNS.has(rawKey as PublicFilterableProblemColumn)) {
      continue
    }

    const key = rawKey as PublicFilterableProblemColumn
    const column = PUBLIC_FILTERABLE_COLUMNS.get(key)
    if (!column) {
      continue
    }

    params.push(key === "difficulty" ? toDifficultyValue(rawValue) : rawValue)

    if (
      key === "primary_topics"
      || key === "secondary_topics"
      || key === "similar_problems"
    ) {
      clauses.push(`${column} IS NOT DISTINCT FROM $${params.length}::varchar[]`)
    }
    else if (key === "difficulty") {
      clauses.push(`${column} IS NOT DISTINCT FROM $${params.length}::difficulty_enum`)
    }
    else if (key === "rating") {
      clauses.push(`${column} IS NOT DISTINCT FROM $${params.length}::double precision`)
    }
    else {
      clauses.push(`${column} IS NOT DISTINCT FROM $${params.length}`)
    }
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  }
}

export default class ProblemDAO implements IProblemDAO {
  constructor(private readonly db: DbClient = client) { }

  async create(problemData: Partial<Problem>): Promise<Problem> {
    const query = `
      INSERT INTO problems (
        title,
        description,
        rating,
        slug,
        hints,
        primary_topics,
        secondary_topics,
        similar_problems,
        difficulty,
        approaches,
        evaluation_criteria
      )
      VALUES ($1, $2, $3::double precision, $4, $5::varchar[], $6::varchar[], $7::varchar[], $8::varchar[], $9::difficulty_enum, $10::jsonb[], $11::varchar[])
      RETURNING ${buildSelectColumns()}
    `

    const params = [
      problemData.title,
      problemData.description,
      problemData.rating,
      problemData.slug,
      problemData.hints ?? [],
      problemData.primary_topics ?? [],
      problemData.secondary_topics ?? [],
      problemData.similar_problems ?? [],
      toDifficultyValue(problemData.difficulty),
      problemData.approaches ?? [],
      problemData.evaluation_criteria ?? [],
    ]

    const result = await this.db.query<ProblemRow>(query, params)

    if (result.rows[0]) {
      return normalizeProblemRow(result.rows[0])
    }

    throw new Error("Problem creation data didn't persist in the database")
  }

  async update(problemId: string, payload: Partial<Problem>): Promise<Problem> {
    const setClauses: string[] = []
    const params: unknown[] = []

    for (const [rawKey, rawValue] of Object.entries(payload)) {
      if (rawKey === "id" || rawValue === undefined) {
        continue
      }

      const key = rawKey as UpdatableProblemColumn
      const column = UPDATABLE_COLUMNS.get(key)
      if (!column) {
        continue
      }

      params.push(key === "difficulty" ? toDifficultyValue(rawValue) : rawValue)
      setClauses.push(`${column} = ${buildProblemValueClause(key, `$${params.length}`)}`)
    }

    if (setClauses.length === 0) {
      const existingProblem = await this.findById(problemId)
      if (!existingProblem) {
        throw new Error("Nothing to update, but couldn't find problem")
      }

      return existingProblem
    }

    params.push(problemId)

    const result = await this.db.query<ProblemRow>(
      `
        UPDATE problems
        SET ${setClauses.join(", ")}
        WHERE id = $${params.length}
        RETURNING ${buildSelectColumns()}
      `,
      params,
    )

    if (result.rows[0]) {
      return normalizeProblemRow(result.rows[0])
    }

    throw new Error("Couldn't persist Problem data update in database")
  }

  async delete(problemId: string): Promise<boolean> {
    const result = await this.db.query(
      "DELETE FROM problems WHERE id = $1 RETURNING id",
      [problemId],
    )

    return result.rowCount === 1
  }

  async findById(problemId: string): Promise<Problem | null> {
    const result = await this.db.query<ProblemRow>(
      `SELECT ${buildSelectColumns()} FROM problems WHERE id = $1 LIMIT 1`,
      [problemId],
    )

    return result.rows[0] ? normalizeProblemRow(result.rows[0]) : null
  }

  async list(filters: Partial<Problem>, page: number, perPage: number): Promise<IPaginated<Problem>> {
    const { whereClause, params } = this.buildFilterClause(filters)
    const offset = (page - 1) * perPage

    const result = await this.db.query<ProblemRow>(
      `
        SELECT ${buildSelectColumns()}
        FROM problems
        ${whereClause}
        ORDER BY title ASC, id ASC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      [...params, perPage, offset],
    )

    return {
      data: result.rows.map((row) => normalizeProblemRow(row)),
      pagination: {
        page,
        perPage,
      },
    }
  }

  async findByName(name: string): Promise<Problem | null> {
    const result = await this.db.query<ProblemRow>(
      `SELECT ${buildSelectColumns()} FROM problems WHERE title = $1 LIMIT 1`,
      [name],
    )

    return result.rows[0] ? normalizeProblemRow(result.rows[0]) : null
  }

  async listForUser(filters: Partial<PublicProblem>, page: number = 1, perPage: number = 10): Promise<IPaginated<PublicProblem>> {
    const { whereClause, params } = buildPublicFilterClause(filters)
    const offset = (page - 1) * perPage
    const result = await this.db.query<PublicProblemRow>(
      `
        SELECT ${buildPublicSelectColumns()}
        FROM problems
        ${whereClause}
        ORDER BY title ASC, id ASC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      [...params, perPage, offset],
    )

    return {
      data: result.rows.map((row) => normalizePublicProblemRow(row)),
      pagination: {
        page,
        perPage,
      },
    }
  }

  async findByIdForUsers(problemId: string): Promise<PublicProblem | null> {
    const result = await this.db.query<PublicProblemRow>(
      `SELECT ${buildPublicSelectColumns()} FROM problems WHERE id = $1 LIMIT 1`,
      [problemId],
    )

    return result.rows[0] ? normalizePublicProblemRow(result.rows[0]) : null
  }

  async findBySlugForUsers(problemSlug: string): Promise<PublicProblem | null> {
    const result = await this.db.query<PublicProblemRow>(
      `SELECT ${buildPublicSelectColumns()} FROM problems WHERE slug = $1 LIMIT 1`,
      [problemSlug],
    )

    return result.rows[0] ? normalizePublicProblemRow(result.rows[0]) : null
  }

  async findBySlug(problemSlug: string): Promise<Problem | null> {
    const result = await this.db.query<PublicProblemRow>(
      `SELECT ${buildSelectColumns()} FROM problems WHERE slug = $1 LIMIT 1`,
      [problemSlug],
    )

    return result.rows[0] ? normalizePublicProblemRow(result.rows[0]) : null
  }

  private buildFilterClause(filters: Partial<Problem>): { whereClause: string; params: unknown[] } {
    const clauses: string[] = []
    const params: unknown[] = []

    for (const [rawKey, rawValue] of Object.entries(filters)) {
      if (rawValue === undefined) {
        continue
      }

      const key = rawKey as FilterableProblemColumn
      const column = FILTERABLE_COLUMNS.get(key)
      if (!column) {
        continue
      }

      params.push(key === "difficulty" ? toDifficultyValue(rawValue) : rawValue)

      if (
        key === "hints"
        || key === "primary_topics"
        || key === "secondary_topics"
        || key === "similar_problems"
        || key === "evaluation_criteria"
      ) {
        clauses.push(`${column} IS NOT DISTINCT FROM $${params.length}::varchar[]`)
      }
      else if (key === "approaches") {
        clauses.push(`${column} IS NOT DISTINCT FROM $${params.length}::jsonb[]`)
      }
      else if (key === "difficulty") {
        clauses.push(`${column} IS NOT DISTINCT FROM $${params.length}::difficulty_enum`)
      }
      else if (key === "rating") {
        clauses.push(`${column} IS NOT DISTINCT FROM $${params.length}::double precision`)
      }
      else {
        clauses.push(`${column} IS NOT DISTINCT FROM $${params.length}`)
      }
    }

    return {
      whereClause: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
      params,
    }
  }
}
