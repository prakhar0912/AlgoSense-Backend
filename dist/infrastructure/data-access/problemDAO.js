import client from "./client.js";
import Problem from "../../entities/problem.js";
const PROBLEM_COLUMNS = [
    "id",
    "title",
    "description",
    "\"testCases\"",
    "difficulty",
    "approaches",
    "evaluation_criteria",
];
const FILTERABLE_COLUMNS = new Map([
    ["id", "id"],
    ["title", "title"],
    ["description", "description"],
    ["testCases", "\"testCases\""],
    ["difficulty", "difficulty"],
    ["approaches", "approaches"],
    ["evaluation_criteria", "evaluation_criteria"],
]);
const UPDATABLE_COLUMNS = new Map([
    ["title", "title"],
    ["description", "description"],
    ["testCases", "\"testCases\""],
    ["difficulty", "difficulty"],
    ["approaches", "approaches"],
    ["evaluation_criteria", "evaluation_criteria"],
]);
function buildSelectColumns() {
    return PROBLEM_COLUMNS.join(", ");
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function toStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item) => typeof item === "string");
}
function toApproachArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter(isRecord);
}
function toDifficulty(value) {
    const parsed = typeof value === "string" ? value : String(value);
    if (parsed === "easy" || parsed === "medium" || parsed === "hard" || parsed === "expert") {
        return parsed;
    }
    return "easy";
}
function normalizeProblemRow(row) {
    const problem = new Problem();
    problem.id = row.id;
    problem.title = row.title;
    problem.description = row.description;
    problem.testCases = toStringArray(row.testCases);
    problem.difficulty = toDifficulty(row.difficulty);
    problem.approaches = toApproachArray(row.approaches);
    problem.evaluation_criteria = toStringArray(row.evaluation_criteria);
    return problem;
}
function normalizeWriteValue(column, value) {
    if (column === "difficulty") {
        return String(value);
    }
    return value;
}
export default class ProblemDAO {
    db;
    constructor(db = client) {
        this.db = db;
    }
    async create(problemData) {
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
        const result = await this.db.query(query, params);
        if (result.rows[0]) {
            return normalizeProblemRow(result.rows[0]);
        }
        throw new Error("Problem creation data didn't persist in the database");
    }
    async update(problemId, payload) {
        const setClauses = [];
        const params = [];
        for (const [rawKey, rawValue] of Object.entries(payload)) {
            if (rawKey === "id" || rawValue === undefined) {
                continue;
            }
            const key = rawKey;
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
        const result = await this.db.query(`
        UPDATE problems
        SET ${setClauses.join(", ")}
        WHERE id = $${params.length}
        RETURNING ${buildSelectColumns()}
      `, params);
        if (result.rows[0]) {
            return normalizeProblemRow(result.rows[0]);
        }
        throw new Error("Couldn't persist Problem data update in database");
    }
    async delete(problemId) {
        const result = await this.db.query("DELETE FROM problems WHERE id = $1 RETURNING id", [problemId]);
        return result.rowCount === 1;
    }
    async findById(problemId) {
        const result = await this.db.query(`SELECT ${buildSelectColumns()} FROM problems WHERE id = $1 LIMIT 1`, [problemId]);
        return result.rows[0] ? normalizeProblemRow(result.rows[0]) : null;
    }
    async list(filters, page, perPage) {
        const { whereClause, params } = this.buildFilterClause(filters);
        const offset = (page - 1) * perPage;
        const result = await this.db.query(`
        SELECT ${buildSelectColumns()}
        FROM problems
        ${whereClause}
        ORDER BY title ASC, id ASC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `, [...params, perPage, offset]);
        return {
            data: result.rows.map((row) => normalizeProblemRow(row)),
            pagination: {
                page,
                perPage,
            },
        };
    }
    async findByName(name) {
        const result = await this.db.query(`SELECT ${buildSelectColumns()} FROM problems WHERE title = $1 LIMIT 1`, [name]);
        return result.rows[0] ? normalizeProblemRow(result.rows[0]) : null;
    }
    buildFilterClause(filters) {
        const clauses = [];
        const params = [];
        for (const [rawKey, rawValue] of Object.entries(filters)) {
            if (rawValue === undefined) {
                continue;
            }
            const key = rawKey;
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
//# sourceMappingURL=problemDAO.js.map