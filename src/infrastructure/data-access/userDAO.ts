import client from './client.js'
import type { PoolClient, QueryResultRow } from 'pg'

import Submission from '../../entities/submission.js'
import User from '../../entities/user.js'
import UserScores from '../../entities/userScores.js'
import type IPaginated from '../../interfaces/paginated.js'
import type IUserDAO from '../../interfaces/user/userDAO.js'

type DbClient = Pick<PoolClient, 'query'>

type UserRow = QueryResultRow & {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: 'admin' | 'user'
  banned: boolean
  scores: unknown | null
  created_at: string | Date | null
  submissions: unknown | null
  email_verified: boolean
  email_notifications_enabled: boolean
}

type ScoreRow = QueryResultRow & {
  scores: unknown | null
}

type SubmissionsRow = QueryResultRow & {
  submissions: unknown | null
}

type EmailNotificationsRow = QueryResultRow & {
  email_notifications_enabled: boolean
}

type JsonLike = Record<string, unknown> | unknown[]

const USER_COLUMNS = [
  'id',
  'email',
  'first_name',
  'last_name',
  'role',
  'banned',
  'scores',
  'created_at',
  'submissions',
  'email_verified',
  'email_notifications_enabled',
] as const

const FILTERABLE_COLUMNS = new Set<keyof User>([
  'id',
  'email',
  'first_name',
  'last_name',
  'role',
  'banned',
  'scores',
  'created_at',
  'submissions',
  'email_verified',
  'email_notifications_enabled',
])

const UPDATABLE_COLUMNS = new Set<keyof User>([
  'email',
  'first_name',
  'last_name',
  'role',
  'banned',
  'scores',
  'created_at',
  'submissions',
  'email_verified',
  'email_notifications_enabled',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toIsoString(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString()
  }

  if (typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString()
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
  }

  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString()
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function toIsoStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => toIsoString(item)).filter((item) => item.length > 0)
}

function normalizeSubmission(value: unknown): Submission {
  const raw = isRecord(value) ? value : {}
  const submission = new Submission()

  submission.id = typeof raw.id === 'string' ? raw.id : ''
  submission.user_id = typeof raw.user_id === 'string' ? raw.user_id : ''
  submission.problem_id = typeof raw.problem_id === 'string' ? raw.problem_id : ''
  submission.difficulty = toFiniteNumber(raw.difficulty)
  submission.user_input = typeof raw.user_input === 'string' ? raw.user_input : ''
  submission.timer = raw.timer === null || raw.timer === undefined ? null : toFiniteNumber(raw.timer)
  if (raw.approach_score !== undefined && raw.approach_score !== null) {
    submission.approach_score = toFiniteNumber(raw.approach_score)
  }
  submission.identified_approach = typeof raw.identified_approach === 'string' ? raw.identified_approach : ''
  submission.pass = typeof raw.pass === 'boolean' ? raw.pass : false
  submission.missing_points = toStringArray(raw.missing_points)
  submission.edge_cases_missed = toStringArray(raw.edge_cases_missed)
  submission.edge_case_score = toFiniteNumber(raw.edge_case_score)
  submission.submitted_at = toIsoString(raw.submitted_at ?? new Date())

  return submission
}

function normalizeScores(value: unknown): UserScores | null {
  if (value === null || value === undefined) {
    return null
  }

  const raw = isRecord(value) ? value : {}
  const scores = new UserScores()
  scores.approaches_score = toFiniteNumber(raw.approaches_score)
  scores.consistency_score = toFiniteNumber(raw.consistency_score)
  scores.edge_case_score = toFiniteNumber(raw.edge_case_score)
  scores.days_logged_in = toIsoStringArray(raw.days_logged_in)
  scores.total_score = scores.approaches_score + scores.consistency_score + scores.edge_case_score

  return scores
}

function normalizeSubmissions(value: unknown): Submission[] | null {
  if (value === null || value === undefined) {
    return null
  }

  if (!Array.isArray(value)) {
    return []
  }

  return value.map((submission) => normalizeSubmission(submission))
}

function buildSelectColumns(): string {
  return USER_COLUMNS.join(', ')
}

function extractJsonPatch(value: unknown): JsonLike | null {
  if (value === null) {
    return null
  }

  if (Array.isArray(value)) {
    return value
  }

  if (isRecord(value)) {
    return value
  }

  return null
}

export default class UserDAO implements IUserDAO {
  constructor(private readonly db: DbClient = client) { }

  async create(userData: User) {
    const query = `
      INSERT INTO users (
        id,
        email,
        first_name,
        last_name,
        role,
        banned,
        scores,
        created_at,
        submissions,
        email_verified,
        email_notifications_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb[], $10, $11)
      RETURNING ${buildSelectColumns()}
    `

    const params = [
      userData.id,
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
      userData.submissions ? userData.submissions.map((submission) => ({
        id: submission.id,
        user_id: submission.user_id,
        problem_id: submission.problem_id,
        difficulty: submission.difficulty,
        user_input: submission.user_input,
        timer: submission.timer ?? null,
        approach_score: submission.approach_score ?? null,
        identified_approach: submission.identified_approach,
        pass: submission.pass,
        missing_points: submission.missing_points,
        edge_cases_missed: submission.edge_cases_missed,
        edge_case_score: submission.edge_case_score,
        submitted_at: submission.submitted_at,
      })) : null,
      userData.email_verified,
      userData.email_notifications_enabled,
    ]

    const result = await this.db.query<UserRow>(query, params)
    if (result.rows[0]) {
      return this.mapUserRow(result.rows[0])
    }
    else {
      throw new Error("User creation data didn't persist in the database")
    }
  }

  async update(userId: string, payload: Partial<User>) {
    return this.updateUserRow(userId, payload)
  }

  async updateSelfProfile(userId: string, payload: Partial<User>) {
    return this.updateUserRow(userId, payload)
  }

  async delete(userId: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [userId],
    )

    if (result.rowCount === 0) {
      throw new Error("Couldn't persist the delete operation")
    }

    return true
  }

  async findById(userId: string) {
    return this.findUserByColumn('id', userId)
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findUserByColumn('email', email)
  }

  async findAll(filters: Partial<User>, page: number, perPage: number): Promise<IPaginated<User>> {
    const { whereClause, params } = this.buildFilterClause(filters)
    const offset = (page - 1) * perPage

    const result = await this.db.query<UserRow>(
      `
        SELECT ${buildSelectColumns()}
        FROM users
        ${whereClause}
        ORDER BY created_at DESC, id ASC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      [...params, perPage, offset],
    )

    return {
      data: result.rows.map((row) => this.mapUserRow(row)),
      pagination: {
        page,
        perPage,
      },
    }
  }

  async toggleBanUser(userId: string, toggle: boolean) {
    return this.updateBooleanField('banned', userId, toggle)
  }

  async unbanUser(userId: string) {
    return this.toggleBanUser(userId, false)
  }

  async getUserScores(userId: string): Promise<UserScores | null> {
    const result = await this.db.query<ScoreRow>(
      'SELECT scores FROM users WHERE id = $1 LIMIT 1',
      [userId],
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return normalizeScores(row.scores)
  }

  async setUserScores(userId: string, scores: Partial<UserScores>): Promise<UserScores> {
    const patch = extractJsonPatch(scores)
    if (!patch) {
      let res = await this.getUserScores(userId)
      if (!res) {
        throw new Error("Failed to persist the update data")
      }
      else {
        return res
      }
    }

    const result = await this.db.query<ScoreRow>(
      `
        UPDATE users
        SET scores = CASE
          WHEN scores IS NULL THEN $2::jsonb
          ELSE scores || $2::jsonb
        END
        WHERE id = $1
        RETURNING scores
      `,
      [userId, patch],
    )

    if (result.rows.length === 0) {
      throw new Error("Failed to persist the update data")
    }

    const row = result.rows[0]
    if (!row) {
      throw new Error("Failed to persist the update data")
    }

    let res = normalizeScores(row.scores)
    if (!res) {
      throw new Error("Failed to persist the update data")
    }
    else {
      return res
    }
  }

  async getUserSubmissions(userId: string): Promise<Submission[] | null> {
    const result = await this.db.query<SubmissionsRow>(
      'SELECT submissions FROM users WHERE id = $1 LIMIT 1',
      [userId],
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return normalizeSubmissions(row.submissions)
  }

  async getLast5Submissions(userId: string): Promise<Submission[] | null> {
    const result = await this.db.query<SubmissionsRow>(
      'SELECT submissions FROM users WHERE id = $1 LIMIT 1',
      [userId],
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    if (!row) {
      return null
    }

    const submissions = normalizeSubmissions(row.submissions)
    if (!submissions) {
      return null
    }

    return submissions.slice(-5)
  }

  async viewProfile(userId: string): Promise<User | null> {
    return this.findById(userId)
  }

  async toggleEmailNotifications(userId: string, enable: boolean): Promise<boolean> {
    const result = await this.db.query<EmailNotificationsRow>(
      `
        UPDATE users
        SET email_notifications_enabled = $2
        WHERE id = $1
        RETURNING email_notifications_enabled
      `,
      [userId, enable],
    )

    if (result.rows.length === 0) {
      throw new Error("Unable to persist the update data")
    }

    const row = result.rows[0]
    if (!row) {
      throw new Error("Unable to persist the update data")
    }

    return row.email_notifications_enabled
  }

  async updateUser(userId: string, payload: Partial<User>): Promise<User> {
    return this.updateUserRow(userId, payload)
  }

  private async findUserByColumn(column: 'id' | 'email', value: string): Promise<User | null> {
    const result = await this.db.query<UserRow>(
      `SELECT ${buildSelectColumns()} FROM users WHERE ${column} = $1 LIMIT 1`,
      [value],
    )

    return result.rows[0] ? this.mapUserRow(result.rows[0]) : null
  }

  private async updateBooleanField(
    column: 'banned' | 'email_notifications_enabled',
    userId: string,
    value: boolean,
  ): Promise<User> {
    const result = await this.db.query<UserRow>(
      `
        UPDATE users
        SET ${column} = $2
        WHERE id = $1
        RETURNING ${buildSelectColumns()}
      `,
      [userId, value],
    )

    if (result.rows[0]) {
      return this.mapUserRow(result.rows[0])
    }
    else {
      throw new Error("Failed to persist update change")
    }
  }

  private buildFilterClause(filters: Partial<User>): { whereClause: string; params: unknown[] } {
    const clauses: string[] = []
    const params: unknown[] = []

    for (const [rawKey, rawValue] of Object.entries(filters)) {
      if (rawValue === undefined) {
        continue
      }

      if (!FILTERABLE_COLUMNS.has(rawKey as keyof User)) {
        continue
      }

      const key = rawKey as keyof User

      switch (key) {
        case 'scores':
        case 'submissions': {
          params.push(extractJsonPatch(rawValue))
          clauses.push(`${key} IS NOT DISTINCT FROM $${params.length}::jsonb`)
          break
        }
        case 'created_at': {
          params.push(toIsoString(rawValue))
          clauses.push(`${key} IS NOT DISTINCT FROM $${params.length}`)
          break
        }
        default: {
          params.push(rawValue)
          clauses.push(`${key} IS NOT DISTINCT FROM $${params.length}`)
          break
        }
      }
    }

    if (clauses.length === 0) {
      return {
        whereClause: '',
        params,
      }
    }

    return {
      whereClause: `WHERE ${clauses.join(' AND ')}`,
      params,
    }
  }

  private async updateUserRow(userId: string, payload: Partial<User>): Promise<User> {
    const setClauses: string[] = []
    const params: unknown[] = []

    for (const [rawKey, rawValue] of Object.entries(payload)) {
      if (rawKey === 'id' || rawValue === undefined) {
        continue
      }

      if (!UPDATABLE_COLUMNS.has(rawKey as keyof User)) {
        continue
      }

      const key = rawKey as keyof User
      switch (key) {
        case 'scores': {
          if (rawValue === null) {
            setClauses.push('scores = NULL')
          } else {
            params.push(extractJsonPatch(rawValue))
            setClauses.push(`scores = CASE WHEN scores IS NULL THEN $${params.length}::jsonb ELSE scores || $${params.length}::jsonb END`)
          }
          break
        }
        case 'submissions': {
          if (rawValue === null) {
            setClauses.push('submissions = NULL')
          } else {
            params.push(rawValue)
            setClauses.push(`submissions = $${params.length}::jsonb`)
          }
          break
        }
        case 'created_at': {
          params.push(toIsoString(rawValue))
          setClauses.push(`created_at = $${params.length}`)
          break
        }
        default: {
          params.push(rawValue)
          setClauses.push(`${key} = $${params.length}`)
          break
        }
      }
    }

    if (setClauses.length === 0) {
      let res = await this.findById(userId)
      if (!res) {
        throw new Error("Nothing to update, but couldn't find user profile")
      }
      else {
        return res
      }
    }

    params.push(userId)

    const result = await this.db.query<UserRow>(
      `
        UPDATE users
        SET ${setClauses.join(', ')}
        WHERE id = $${params.length}
        RETURNING ${buildSelectColumns()}
      `,
      params,
    )

    if (result.rows[0]) {
      return this.mapUserRow(result.rows[0])
    }
    else {
      throw new Error("Couldn't persist User data update in database")
    }
  }

  private mapUserRow(row: UserRow): User {
    const user = new User()
    user.id = row.id
    user.email = row.email
    user.first_name = row.first_name ?? null
    user.last_name = row.last_name ?? null
    user.role = row.role
    user.banned = row.banned
    user.scores = normalizeScores(row.scores)
    user.created_at = toIsoString(row.created_at)
    user.submissions = normalizeSubmissions(row.submissions)
    user.email_verified = row.email_verified
    user.email_notifications_enabled = row.email_notifications_enabled
    return user
  }
}
