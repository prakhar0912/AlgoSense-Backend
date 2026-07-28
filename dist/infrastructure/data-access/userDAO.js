// TODO: Change created_at from a string to a proper ISODate format capable of validation
//TODO: Let the user table hold only the latest 5 submission's small information
import client from './client.js';
import ShortSubmission from '../../entities/shortSubmission.js';
import User from '../../entities/user.js';
import UserScores from '../../entities/userScores.js';
const USER_COLUMNS = [
    'id',
    'email',
    'first_name',
    'last_name',
    'role',
    'banned',
    'scores',
    'created_at',
    'last_5_submissions',
    'email_verified',
    'email_notifications_enabled',
];
const FILTERABLE_COLUMNS = new Set([
    'id',
    'email',
    'first_name',
    'last_name',
    'role',
    'banned',
    'scores',
    'created_at',
    'last_5_submissions',
    'email_verified',
    'email_notifications_enabled',
]);
const UPDATABLE_COLUMNS = new Set([
    'email',
    'first_name',
    'last_name',
    'role',
    'banned',
    'scores',
    'created_at',
    'last_5_submissions',
    'email_verified',
    'email_notifications_enabled',
]);
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function toIsoString(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? '' : value.toISOString();
    }
    if (typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
    }
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
    }
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}
function toFiniteNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return 0;
}
function toStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item) => typeof item === 'string');
}
function toIsoStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map((item) => toIsoString(item)).filter((item) => item.length > 0);
}
function normalizeShortSubmission(value) {
    const raw = isRecord(value) ? value : {};
    const submission = new ShortSubmission();
    submission.submission_id = typeof raw.submission_id === 'string'
        ? raw.submission_id
        : typeof raw.id === 'string'
            ? raw.id
            : '';
    submission.problem_id = typeof raw.problem_id === 'string' ? raw.problem_id : '';
    submission.difficulty = raw.difficulty;
    submission.timer = raw.timer === null || raw.timer === undefined ? null : toFiniteNumber(raw.timer);
    submission.approach_score = toFiniteNumber(raw.approach_score);
    submission.identified_approach = typeof raw.identified_approach === 'string' ? raw.identified_approach : '';
    submission.pass = typeof raw.pass === 'boolean' ? raw.pass : false;
    submission.edge_case_score = toFiniteNumber(raw.edge_case_score);
    submission.submitted_at = toIsoString(raw.submitted_at ?? new Date());
    return submission;
}
function normalizeScores(value) {
    if (value === null || value === undefined) {
        return null;
    }
    const raw = isRecord(value) ? value : {};
    const scores = new UserScores();
    scores.approaches_score = toFiniteNumber(raw.approaches_score);
    scores.consistency_score = toFiniteNumber(raw.consistency_score);
    scores.edge_case_score = toFiniteNumber(raw.edge_case_score);
    scores.days_logged_in = toIsoStringArray(raw.days_logged_in);
    scores.total_score = toFiniteNumber(raw.total_score);
    // scores.total_score = scores.approaches_score + scores.consistency_score + scores.edge_case_score
    return scores;
}
function normalizeShortSubmissions(value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map((submission) => normalizeShortSubmission(submission));
}
function toShortSubmissionJson(submission) {
    const normalized = normalizeShortSubmission(submission);
    return {
        submission_id: normalized.submission_id,
        problem_id: normalized.problem_id,
        difficulty: normalized.difficulty,
        timer: normalized.timer,
        approach_score: normalized.approach_score,
        identified_approach: normalized.identified_approach,
        pass: normalized.pass,
        edge_case_score: normalized.edge_case_score,
        submitted_at: normalized.submitted_at,
    };
}
function toShortSubmissionJsonArray(value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (!Array.isArray(value)) {
        return null;
    }
    return value.map((submission) => toShortSubmissionJson(submission));
}
function buildSelectColumns() {
    return USER_COLUMNS.join(', ');
}
function extractJsonPatch(value) {
    if (value === null) {
        return null;
    }
    if (Array.isArray(value)) {
        return value;
    }
    if (isRecord(value)) {
        return value;
    }
    return null;
}
export default class UserDAO {
    db;
    constructor(db = client) {
        this.db = db;
    }
    async create(userData) {
        const query = `
      INSERT INTO users (
        email,
        first_name,
        last_name,
        role,
        banned,
        scores,
        created_at,
        last_5_submissions,
        email_verified,
        email_notifications_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb[], $9, $10)
      RETURNING ${buildSelectColumns()}
    `;
        const params = [
            userData.email,
            userData.first_name ?? null,
            userData.last_name ?? null,
            userData.role,
            userData.banned,
            userData.scores ? {
                approaches_score: userData.scores.approaches_score,
                consistency_score: userData.scores.consistency_score,
                edge_case_score: userData.scores.edge_case_score,
                days_logged_in: userData.scores.days_logged_in,
                total_score: userData.scores.total_score,
            } : null,
            toIsoString(userData.created_at),
            toShortSubmissionJsonArray(userData.last_5_submissions),
            userData.email_verified,
            userData.email_notifications_enabled,
        ];
        const result = await this.db.query(query, params);
        if (result.rows[0]) {
            return this.mapUserRow(result.rows[0]);
        }
        else {
            throw new Error("User creation data didn't persist in the database");
        }
    }
    async update(userId, payload) {
        return this.updateUserRow(userId, payload);
    }
    async updateSelfProfile(userId, payload) {
        return this.updateUserRow(userId, payload);
    }
    async delete(userId) {
        const result = await this.db.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
        if (result.rowCount === 0) {
            throw new Error("Couldn't persist the delete operation");
        }
        return true;
    }
    async findById(userId) {
        return this.findUserByColumn('id', userId);
    }
    async findByEmail(email) {
        return this.findUserByColumn('email', email);
    }
    async findAll(filters, page, perPage) {
        const { whereClause, params } = this.buildFilterClause(filters);
        const offset = (page - 1) * perPage;
        const result = await this.db.query(`
        SELECT ${buildSelectColumns()}
        FROM users
        ${whereClause}
        ORDER BY created_at DESC, id ASC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `, [...params, perPage, offset]);
        return {
            data: result.rows.map((row) => this.mapUserRow(row)),
            pagination: {
                page,
                perPage,
            },
        };
    }
    async toggleBanUser(userId, toggle) {
        return this.updateBooleanField('banned', userId, toggle);
    }
    async unbanUser(userId) {
        return this.toggleBanUser(userId, false);
    }
    async getUserScores(userId) {
        const result = await this.db.query('SELECT scores FROM users WHERE id = $1 LIMIT 1', [userId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        if (!row) {
            return null;
        }
        return normalizeScores(row.scores);
    }
    async setUserScores(userId, scores) {
        const patch = extractJsonPatch(scores);
        if (!patch) {
            let res = await this.getUserScores(userId);
            if (!res) {
                throw new Error("Failed to persist the update data");
            }
            else {
                return res;
            }
        }
        const result = await this.db.query(`
        UPDATE users
        SET scores = CASE
          WHEN scores IS NULL THEN $2::jsonb
          ELSE scores || $2::jsonb
        END
        WHERE id = $1
        RETURNING scores
      `, [userId, patch]);
        if (result.rows.length === 0) {
            throw new Error("Failed to persist the update data");
        }
        const row = result.rows[0];
        if (!row) {
            throw new Error("Failed to persist the update data");
        }
        let res = normalizeScores(row.scores);
        if (!res) {
            throw new Error("Failed to persist the update data");
        }
        else {
            return res;
        }
    }
    async getUserSubmissions(userId) {
        const result = await this.db.query('SELECT last_5_submissions FROM users WHERE id = $1 LIMIT 1', [userId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        if (!row) {
            return null;
        }
        return normalizeShortSubmissions(row.last_5_submissions);
    }
    async getLast5Submissions(userId) {
        const result = await this.db.query('SELECT last_5_submissions FROM users WHERE id = $1 LIMIT 1', [userId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        if (!row) {
            return null;
        }
        const submissions = normalizeShortSubmissions(row.last_5_submissions);
        if (!submissions) {
            return null;
        }
        return submissions.slice(-5);
    }
    async setSubmissionsInProfile(userId, payload) {
        const result = await this.db.query(`
        UPDATE users
        SET last_5_submissions = $2::jsonb[]
        WHERE id = $1
        RETURNING last_5_submissions
      `, [userId, toShortSubmissionJsonArray(payload)]);
        if (result.rows.length === 0) {
            throw new Error("Failed to persist the update data");
        }
        const row = result.rows[0];
        if (!row) {
            throw new Error("Failed to persist the update data");
        }
        const submissions = normalizeShortSubmissions(row.last_5_submissions);
        if (!submissions) {
            throw new Error("Failed to persist the update data");
        }
        return submissions;
    }
    async viewProfile(userId) {
        return this.findById(userId);
    }
    async toggleEmailNotifications(userId, enable) {
        const result = await this.db.query(`
        UPDATE users
        SET email_notifications_enabled = $2
        WHERE id = $1
        RETURNING email_notifications_enabled
      `, [userId, enable]);
        if (result.rows.length === 0) {
            throw new Error("Unable to persist the update data");
        }
        const row = result.rows[0];
        if (!row) {
            throw new Error("Unable to persist the update data");
        }
        return row.email_notifications_enabled;
    }
    async updateUser(userId, payload) {
        return this.updateUserRow(userId, payload);
    }
    async findUserByColumn(column, value) {
        const result = await this.db.query(`SELECT ${buildSelectColumns()} FROM users WHERE ${column} = $1 LIMIT 1`, [value]);
        return result.rows[0] ? this.mapUserRow(result.rows[0]) : null;
    }
    async updateBooleanField(column, userId, value) {
        const result = await this.db.query(`
        UPDATE users
        SET ${column} = $2
        WHERE id = $1
        RETURNING ${buildSelectColumns()}
      `, [userId, value]);
        if (result.rows[0]) {
            return this.mapUserRow(result.rows[0]);
        }
        else {
            throw new Error("Failed to persist update change");
        }
    }
    buildFilterClause(filters) {
        const clauses = [];
        const params = [];
        if (filters === undefined || filters === null) {
            return {
                whereClause: '',
                params: [],
            };
        }
        for (const [rawKey, rawValue] of Object.entries(filters)) {
            if (rawValue === undefined) {
                continue;
            }
            if (!FILTERABLE_COLUMNS.has(rawKey)) {
                continue;
            }
            const key = rawKey;
            switch (key) {
                case 'scores': {
                    params.push(extractJsonPatch(rawValue));
                    clauses.push(`${key} IS NOT DISTINCT FROM $${params.length}::jsonb`);
                    break;
                }
                case 'last_5_submissions': {
                    params.push(toShortSubmissionJsonArray(rawValue));
                    clauses.push(`${key} IS NOT DISTINCT FROM $${params.length}::jsonb[]`);
                    break;
                }
                case 'created_at': {
                    params.push(toIsoString(rawValue));
                    clauses.push(`${key} IS NOT DISTINCT FROM $${params.length}`);
                    break;
                }
                default: {
                    params.push(rawValue);
                    clauses.push(`${key} IS NOT DISTINCT FROM $${params.length}`);
                    break;
                }
            }
        }
        if (clauses.length === 0) {
            return {
                whereClause: '',
                params,
            };
        }
        return {
            whereClause: `WHERE ${clauses.join(' AND ')}`,
            params,
        };
    }
    async updateUserRow(userId, payload) {
        const setClauses = [];
        const params = [];
        for (const [rawKey, rawValue] of Object.entries(payload)) {
            if (rawKey === 'id' || rawValue === undefined) {
                continue;
            }
            if (!UPDATABLE_COLUMNS.has(rawKey)) {
                continue;
            }
            const key = rawKey;
            switch (key) {
                case 'scores': {
                    if (rawValue === null) {
                        setClauses.push('scores = NULL');
                    }
                    else {
                        params.push(extractJsonPatch(rawValue));
                        setClauses.push(`scores = CASE WHEN scores IS NULL THEN $${params.length}::jsonb ELSE scores || $${params.length}::jsonb END`);
                    }
                    break;
                }
                case 'last_5_submissions': {
                    if (rawValue === null) {
                        setClauses.push('last_5_submissions = NULL');
                    }
                    else {
                        params.push(toShortSubmissionJsonArray(rawValue));
                        setClauses.push(`last_5_submissions = $${params.length}::jsonb[]`);
                    }
                    break;
                }
                case 'created_at': {
                    params.push(toIsoString(rawValue));
                    setClauses.push(`created_at = $${params.length}`);
                    break;
                }
                default: {
                    params.push(rawValue);
                    setClauses.push(`${key} = $${params.length}`);
                    break;
                }
            }
        }
        if (setClauses.length === 0) {
            let res = await this.findById(userId);
            if (!res) {
                throw new Error("Nothing to update, but couldn't find user profile");
            }
            else {
                return res;
            }
        }
        params.push(userId);
        const result = await this.db.query(`
        UPDATE users
        SET ${setClauses.join(', ')}
        WHERE id = $${params.length}
        RETURNING ${buildSelectColumns()}
      `, params);
        if (result.rows[0]) {
            return this.mapUserRow(result.rows[0]);
        }
        else {
            throw new Error("Couldn't persist User data update in database");
        }
    }
    mapUserRow(row) {
        const user = new User();
        user.id = row.id;
        user.email = row.email;
        user.first_name = row.first_name ?? undefined;
        user.last_name = row.last_name ?? undefined;
        user.role = row.role;
        user.banned = row.banned;
        user.scores = normalizeScores(row.scores);
        user.created_at = toIsoString(row.created_at);
        user.last_5_submissions = normalizeShortSubmissions(row.last_5_submissions);
        user.email_verified = row.email_verified;
        user.email_notifications_enabled = row.email_notifications_enabled;
        return user;
    }
}
//# sourceMappingURL=userDAO.js.map