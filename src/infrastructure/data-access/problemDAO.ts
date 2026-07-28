import client from "./client.js";
import type { PoolClient, QueryResultRow } from "pg";

import Problem from "../../entities/problem.js";
import type IPaginated from "../../interfaces/paginated.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";

type DbClient = Pick<PoolClient, "query">;


type ProblemRow = QueryResultRow & {
  id: string;
  title: string;
  description: string;
  testCases: unknown;
  difficulty: number | string;
  approaches: unknown;
  evaluation_criteria: unknown;
};

type FilterableProblemColumn = keyof Pick<
  Problem,
  "id" | "title" | "description" | "testCases" | "difficulty" | "approaches" | "evaluation_criteria"
>;

type UpdatableProblemColumn = keyof Pick<
  Problem,
  "title" | "description" | "testCases" | "difficulty" | "approaches" | "evaluation_criteria"
>;

const PROBLEM_COLUMNS = [
  "id",
  "title",
  "description",
  "\"testCases\"",
  "difficulty",
  "approaches",
  "evaluation_criteria",
] as const;

const FILTERABLE_COLUMNS: ReadonlyMap<FilterableProblemColumn, string> = new Map([
  ["id", "id"],
  ["title", "title"],
  ["description", "description"],
  ["testCases", "\"testCases\""],
  ["difficulty", "difficulty"],
  ["approaches", "approaches"],
  ["evaluation_criteria", "evaluation_criteria"],
]);

const UPDATABLE_COLUMNS: ReadonlyMap<UpdatableProblemColumn, string> = new Map([
  ["title", "title"],
  ["description", "description"],
  ["testCases", "\"testCases\""],
  ["difficulty", "difficulty"],
  ["approaches", "approaches"],
  ["evaluation_criteria", "evaluation_criteria"],
]);

function buildSelectColumns(): string {
  return PROBLEM_COLUMNS.join(", ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function toApproachArray(value: Problem['approaches']): Problem['approaches'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
}

function toDifficulty(value: unknown): Problem["difficulty"] {
  const parsed = typeof value === "string" ? value : String(value);

  if (parsed === "easy" || parsed === "medium" || parsed === "hard" || parsed === "expert") {
    return parsed;
  }

  return "easy";
}

function normalizeProblemRow(row: ProblemRow): Problem {
  const problem = new Problem();

  problem.id = row.id;
  problem.title = row.title;
  problem.description = row.description;
  problem.testCases = toStringArray(row.testCases);
  problem.difficulty = toDifficulty(row.difficulty);
  problem.approaches = toApproachArray(row.approaches as Problem['approaches'])
  problem.evaluation_criteria = toStringArray(row.evaluation_criteria);

  return problem;
}

function normalizeWriteValue(column: keyof Problem, value: unknown): unknown {
  if (column === "difficulty") {
    return String(value);
  }

  return value;
}

export default class ProblemDAO implements IProblemDAO {
  constructor(private readonly db: DbClient = client) { }

  async create(problemData: Partial<Problem>): Promise<Problem> {
    const query = `
      INSERT INTO problems (
        title,
        description,
        "testCases",
        difficulty,
        approaches,
        evaluation_criteria
      )
      VALUES ($1, $2, $3::varchar[], $4::difficulty_enum, $5::jsonb[], $6::varchar[])
      RETURNING ${buildSelectColumns()}
    `;

    const params = [
      problemData.title,
      problemData.description,
      problemData.testCases ?? [],
      String(problemData.difficulty),
      problemData.approaches ?? [],
      problemData.evaluation_criteria ?? [],
    ];

    const result = await this.db.query<ProblemRow>(query, params);

    if (result.rows[0]) {
      return normalizeProblemRow(result.rows[0]);
    }

    throw new Error("Problem creation data didn't persist in the database");
  }

  async update(problemId: string, payload: Partial<Problem>): Promise<Problem> {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const [rawKey, rawValue] of Object.entries(payload)) {
      if (rawKey === "id" || rawValue === undefined) {
        continue;
      }

      const key = rawKey as UpdatableProblemColumn;
      const column = UPDATABLE_COLUMNS.get(key);
      if (!column) {
        continue;
      }

      params.push(normalizeWriteValue(key, rawValue));

      if (key === "testCases" || key === "evaluation_criteria") {
        setClauses.push(`${column} = $${params.length}::varchar[]`);
      }
      else if (key === "approaches") {
        setClauses.push(`${column} = $${params.length}::jsonb[]`);
      }
      else if (key === "difficulty") {
        setClauses.push(`${column} = $${params.length}::difficulty_enum`);
      }
      else {
        setClauses.push(`${column} = $${params.length}`);
      }
    }

    if (setClauses.length === 0) {
      const existingProblem = await this.findById(problemId);
      if (!existingProblem) {
        throw new Error("Nothing to update, but couldn't find problem");
      }

      return existingProblem;
    }

    params.push(problemId);

    const result = await this.db.query<ProblemRow>(
      `
        UPDATE problems
        SET ${setClauses.join(", ")}
        WHERE id = $${params.length}
        RETURNING ${buildSelectColumns()}
      `,
      params,
    );

    if (result.rows[0]) {
      return normalizeProblemRow(result.rows[0]);
    }

    throw new Error("Couldn't persist Problem data update in database");
  }

  async delete(problemId: string): Promise<boolean> {
    const result = await this.db.query(
      "DELETE FROM problems WHERE id = $1 RETURNING id",
      [problemId],
    );

    return result.rowCount === 1;
  }

  async findById(problemId: string): Promise<Problem | null> {
    const result = await this.db.query<ProblemRow>(
      `SELECT ${buildSelectColumns()} FROM problems WHERE id = $1 LIMIT 1`,
      [problemId],
    );

    return result.rows[0] ? normalizeProblemRow(result.rows[0]) : null;
  }

  async list(filters: Partial<Problem>, page: number, perPage: number): Promise<IPaginated<Problem>> {
    const { whereClause, params } = this.buildFilterClause(filters);
    const offset = (page - 1) * perPage;

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
    );

    return {
      data: result.rows.map((row) => normalizeProblemRow(row)),
      pagination: {
        page,
        perPage,
      },
    };
  }

  async findByName(name: string): Promise<Problem | null> {
    const result = await this.db.query<ProblemRow>(
      `SELECT ${buildSelectColumns()} FROM problems WHERE title = $1 LIMIT 1`,
      [name],
    );

    return result.rows[0] ? normalizeProblemRow(result.rows[0]) : null;
  }

  private buildFilterClause(filters: Partial<Problem>): { whereClause: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];

    for (const [rawKey, rawValue] of Object.entries(filters)) {
      if (rawValue === undefined) {
        continue;
      }

      const key = rawKey as FilterableProblemColumn;
      const column = FILTERABLE_COLUMNS.get(key);
      if (!column) {
        continue;
      }

      params.push(normalizeWriteValue(key, rawValue));

      if (key === "testCases" || key === "evaluation_criteria") {
        clauses.push(`${column} IS NOT DISTINCT FROM $${params.length}::varchar[]`);
      }
      else if (key === "approaches") {
        clauses.push(`${column} IS NOT DISTINCT FROM $${params.length}::jsonb[]`);
      }
      else if (key === "difficulty") {
        clauses.push(`${column} IS NOT DISTINCT FROM $${params.length}::difficulty_enum`);
      }
      else {
        clauses.push(`${column} IS NOT DISTINCT FROM $${params.length}`);
      }
    }

    return {
      whereClause: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
      params,
    };
  }
}
