import client from "./client.js";
import Submission from "../../entities/submission.js";
const SUBMISSION_COLUMNS = [
    "id",
    "user_id",
    "problem_id",
    "difficulty",
    "user_input",
    "timer",
    "approach_score",
    "identified_approach",
    "pass",
    "missing_points",
    "edge_cases",
    "edge_case_score",
    "submitted_at",
];
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function toIsoString(value) {
    if (value === null || value === undefined) {
        return "";
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? "" : value.toISOString();
    }
    if (typeof value === "number") {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
    }
    if (typeof value === "string") {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
    }
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}
function toFiniteNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return 0;
}
function toDifficulty(value) {
    const parsed = typeof value === "string" ? value : String(value);
    if (parsed === "easy" || parsed === "medium" || parsed === "hard" || parsed === "expert") {
        return parsed;
    }
    return "easy";
}
function toMissingPointsArray(value) {
    if (typeof value === "string") {
        return value.trim().length > 0 ? [value] : [];
    }
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item) => typeof item === "string");
}
function toEdgeCaseImportance(value) {
    if (value === "critical" || value === "high" || value === "medium" || value === "low") {
        return value;
    }
    return "low";
}
function toEdgeCaseCoverage(value) {
    if (value === "correct" || value === "partial" || value === "incorrect" || value === "missing") {
        return value;
    }
    return "missing";
}
function normalizeEdgeCase(value) {
    if (isRecord(value)) {
        return {
            description: typeof value.description === "string" ? value.description : "",
            importance: toEdgeCaseImportance(value.importance),
            coverage: toEdgeCaseCoverage(value.coverage),
        };
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return null;
        }
        try {
            const parsed = JSON.parse(trimmed);
            if (isRecord(parsed)) {
                return {
                    description: typeof parsed.description === "string" ? parsed.description : "",
                    importance: toEdgeCaseImportance(parsed.importance),
                    coverage: toEdgeCaseCoverage(parsed.coverage),
                };
            }
        }
        catch {
            return {
                description: value,
                importance: "low",
                coverage: "missing",
            };
        }
        return {
            description: value,
            importance: "low",
            coverage: "missing",
        };
    }
    return null;
}
function toEdgeCaseArray(value) {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return [];
        }
        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? toEdgeCaseArray(parsed) : [];
        }
        catch {
            return [];
        }
    }
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map((item) => normalizeEdgeCase(item)).filter((item) => item !== null);
}
function buildSelectColumns() {
    return SUBMISSION_COLUMNS.join(", ");
}
function normalizeSubmissionScoreRow(row) {
    return {
        problem_id: row.problem_id,
        difficulty: toDifficulty(row.difficulty),
        approach_score: toFiniteNumber(row.approach_score),
        edge_case_score: toFiniteNumber(row.edge_case_score),
        submitted_at: toIsoString(row.submitted_at),
    };
}
function normalizeSubmissionRow(row) {
    const submission = new Submission();
    const raw = isRecord(row) ? row : {};
    submission.id = typeof raw.id === "string" ? raw.id : row.id;
    submission.user_id = typeof raw.user_id === "string" ? raw.user_id : row.user_id;
    submission.problem_id = typeof raw.problem_id === "string" ? raw.problem_id : row.problem_id;
    submission.difficulty = toDifficulty(raw.difficulty ?? row.difficulty);
    submission.user_input = typeof raw.user_input === "string" ? raw.user_input : row.user_input;
    submission.timer = raw.timer === null || raw.timer === undefined ? null : toFiniteNumber(raw.timer);
    if (raw.approach_score !== undefined && raw.approach_score !== null) {
        submission.approach_score = toFiniteNumber(raw.approach_score);
    }
    submission.identified_approach = typeof raw.identified_approach === "string" ? raw.identified_approach : "";
    submission.pass = typeof raw.pass === "boolean" ? raw.pass : false;
    submission.missing_points = toMissingPointsArray(raw.missing_points ?? row.missing_points);
    submission.edge_cases = toEdgeCaseArray(raw.edge_cases ?? raw.edge_cases_missed);
    submission.edge_case_score = toFiniteNumber(raw.edge_case_score ?? row.edge_case_score);
    submission.submitted_at = toIsoString(raw.submitted_at ?? row.submitted_at ?? new Date());
    return submission;
}
export default class SubmissionDAO {
    db;
    constructor(db = client) {
        this.db = db;
    }
    async create(submissionPayload) {
        const query = `
      INSERT INTO submissions (
        user_id,
        problem_id,
        difficulty,
        user_input,
        timer,
        approach_score,
        identified_approach,
        pass,
        missing_points,
        edge_cases,
        edge_case_score,
        submitted_at
      )
      VALUES ($1, $2, $3::difficulty_enum, $4, $5, $6, $7, $8, $9::text[], $10::jsonb[], $11, $12)
      RETURNING ${buildSelectColumns()}
    `;
        const params = [
            submissionPayload.user_id,
            submissionPayload.problem_id,
            String(submissionPayload.difficulty),
            submissionPayload.user_input,
            submissionPayload.timer ?? null,
            submissionPayload.approach_score ?? null,
            submissionPayload.identified_approach ?? "",
            submissionPayload.pass ?? false,
            toMissingPointsArray(submissionPayload.missing_points),
            toEdgeCaseArray(submissionPayload.edge_cases),
            submissionPayload.edge_case_score ?? null,
            submissionPayload.submitted_at ? toIsoString(submissionPayload.submitted_at) : new Date().toISOString(),
        ];
        const result = await this.db.query(query, params);
        if (result.rows[0]) {
            return normalizeSubmissionRow(result.rows[0]);
        }
        throw new Error("Submission creation data didn't persist in the database");
    }
    async viewById(submissionId) {
        const result = await this.db.query(`SELECT ${buildSelectColumns()} FROM submissions WHERE id = $1 LIMIT 1`, [submissionId]);
        if (!result.rows[0]) {
            return null;
        }
        return normalizeSubmissionRow(result.rows[0]);
    }
    async viewByUser(userId) {
        const result = await this.db.query(`
        SELECT ${buildSelectColumns()}
        FROM submissions
        WHERE user_id = $1
        ORDER BY submitted_at DESC, id DESC
      `, [userId]);
        return {
            data: result.rows.map((row) => normalizeSubmissionRow(row)),
            pagination: {
                page: 1,
                perPage: result.rows.length,
            },
        };
    }
    async viewScoresByUser(userId) {
        const result = await this.db.query(`
        SELECT problem_id, difficulty, approach_score, edge_case_score, submitted_at
        FROM (
          SELECT DISTINCT ON (problem_id)
            problem_id,
            difficulty,
            approach_score,
            edge_case_score,
            submitted_at
          FROM submissions
          WHERE user_id = $1
          ORDER BY problem_id, approach_score DESC NULLS LAST, edge_case_score DESC NULLS LAST, submitted_at DESC NULLS LAST, id DESC
        ) best_submissions
        ORDER BY approach_score DESC NULLS LAST, edge_case_score DESC NULLS LAST, difficulty ASC
      `, [userId]);
        return result.rows.map((row) => normalizeSubmissionScoreRow(row));
    }
}
//# sourceMappingURL=submissionDAO.js.map