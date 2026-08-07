//TODO: In all DAOs use the base entities as types to spot errors during entity definition changes easily
import client from './client.js'
import type { PoolClient, QueryResultRow } from 'pg'

import ShortSubmission from '../../entities/shortSubmission.js'
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
  last_5_submissions: unknown | null
  email_verified: boolean
  email_notifications_enabled: boolean
}

type ScoreRow = QueryResultRow & {
  scores: unknown | null
}

type Last5SubmissionsRow = QueryResultRow & {
  last_5_submissions: unknown | null
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
  'last_5_submissions',
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
  'last_5_submissions',
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
  'last_5_submissions',
  'email_verified',
  'email_notifications_enabled',
])

const TOPIC_RATING_DEFAULTS = {
  array: 0,
  math: 0,
  depthFirstSearch: 0,
  breadthFirstSearch: 0,
  unionFind: 0,
  geometry: 0,
  dynamicProgramming: 0,
  binaryIndexedTree: 0,
  orderedSet: 0,
  binarySearch: 0,
  greedy: 0,
  heapPriorityQueue: 0,
  string: 0,
  backtracking: 0,
  numberTheory: 0,
  bitManipulation: 0,
  bitmask: 0,
  graph: 0,
  topologicalSort: 0,
  enumeration: 0,
  matrix: 0,
  prefixSum: 0,
  hashTable: 0,
  tree: 0,
  simulation: 0,
  sorting: 0,
  stack: 0,
  queue: 0,
  monotonicStack: 0,
  monotonicQueue: 0,
  segmentTree: 0,
  counting: 0,
  shortestPath: 0,
  recursion: 0,
  stringMatching: 0,
  slidingWindow: 0,
  memoization: 0,
  gameTheory: 0,
  divideAndConquer: 0,
  combinatorics: 0,
  trie: 0,
  twoPointers: 0,
  rollingHash: 0,
  hashFunction: 0,
  sweepLine: 0,
  suffixArray: 0,
  eulerianCircuit: 0,
  linkedList: 0,
  doublyLinkedList: 0,
  minimumSpanningTree: 0,
  stronglyConnectedComponent: 0,
  binarySearchTree: 0,
  binaryTree: 0,
  design: 0,
  probabilityAndStatistics: 0,
  dataStream: 0,
  brainteaser: 0,
  mergeSort: 0,
  sort: 0,
  randomized: 0,
  biconnectedComponent: 0,
  interactive: 0,
  quickselect: 0,
  radixSort: 0,
  iterator: 0,
  countingSort: 0,
} as const

const TOPIC_RATING_KEYS = Object.keys(TOPIC_RATING_DEFAULTS) as Array<keyof typeof TOPIC_RATING_DEFAULTS>

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

// function toStringArray(value: unknown): string[] {
//   if (typeof value === 'string') {
//     return value.trim().length > 0 ? [value] : []
//   }
//
//   if (!Array.isArray(value)) {
//     return []
//   }
//
//   return value.filter((item): item is string => typeof item === 'string')
// }

function toIsoStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => toIsoString(item)).filter((item) => item.length > 0)
}

function normalizeShortSubmission(value: unknown): ShortSubmission {
  const raw = isRecord(value) ? value : {}
  const submission = new ShortSubmission()

  submission.submission_id = typeof raw.submission_id === 'string'
    ? raw.submission_id
    : typeof raw.id === 'string'
      ? raw.id
      : ''
  submission.problem_id = typeof raw.problem_id === 'string' ? raw.problem_id : ''
  submission.difficulty = raw.difficulty as ShortSubmission['difficulty']
  submission.timer = raw.timer === null || raw.timer === undefined ? null : toFiniteNumber(raw.timer)
  submission.approach_score = toFiniteNumber(raw.approach_score)
  submission.identified_approach = typeof raw.identified_approach === 'string' ? raw.identified_approach : ''
  submission.pass = typeof raw.pass === 'boolean' ? raw.pass : false
  submission.edge_case_score = toFiniteNumber(raw.edge_case_score)
  submission.submitted_at = toIsoString(raw.submitted_at ?? new Date())

  return submission
}

function normalizeShortSubmissions(value: unknown): ShortSubmission[] | null {
  if (value === null || value === undefined) {
    return null
  }

  if (!Array.isArray(value)) {
    return []
  }

  return value.map((submission) => normalizeShortSubmission(submission))
}

function toShortSubmissionJson(submission: unknown): JsonLike {
  const normalized = normalizeShortSubmission(submission)

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
  }
}

function toShortSubmissionJsonArray(value: unknown): JsonLike | null {
  if (value === null || value === undefined) {
    return null
  }

  if (!Array.isArray(value)) {
    return null
  }

  return value.map((submission) => toShortSubmissionJson(submission))
}

function normalizeTopicRatings(value: unknown): UserScores['topic_ratings'] {
  const raw = isRecord(value) ? value : {}
  const topicRatings: Record<string, number> = {}

  for (const key of TOPIC_RATING_KEYS) {
    topicRatings[key] = toFiniteNumber(raw[key])
  }

  return topicRatings as UserScores['topic_ratings']
}

function normalizeScores(value: unknown): UserScores {

  const raw = isRecord(value) ? value : {}
  const scores = new UserScores()

  scores.initial_elo_rating = toFiniteNumber(raw.initial_elo_rating ?? 1500)
  scores.elo_rating = toFiniteNumber(raw.elo_rating ?? 1500)
  scores.topic_ratings = normalizeTopicRatings(raw.topic_ratings)
  scores.approaches_score = toFiniteNumber(raw.approaches_score)
  scores.consistency_score = toFiniteNumber(raw.consistency_score)
  scores.edge_case_score = toFiniteNumber(raw.edge_case_score)
  scores.days_logged_in = toIsoStringArray(raw.days_logged_in)
  scores.total_score = raw.total_score === undefined || raw.total_score === null
    ? scores.approaches_score + scores.consistency_score + scores.edge_case_score
    : toFiniteNumber(raw.total_score)

  return scores
}

function serializeScores(value: Partial<UserScores> | null | undefined): JsonLike | null {
  if (value === null || value === undefined) {
    return null
  }

  if (!isRecord(value)) {
    return null
  }

  const payload: Record<string, unknown> = {}

  for (const [key, rawValue] of Object.entries(value)) {
    if (rawValue !== undefined) {
      payload[key] = rawValue
    }
  }

  return payload
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
        last_5_submissions,
        email_verified,
        email_notifications_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb[], $10, $11)
      ON CONFLICT (id)
      DO UPDATE
      SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      email_verified = EXCLUDED.email_verified
      RETURNING ${buildSelectColumns()}
    `

    const params = [
      userData.id,
      userData.email,
      userData.first_name ?? null,
      userData.last_name ?? null,
      userData.role,
      userData.banned,
      serializeScores(userData.scores),
      toIsoString(userData.created_at),
      toShortSubmissionJsonArray(userData.last_5_submissions),
      userData.email_verified,
      userData.email_notifications_enabled,
    ]

    const result = await this.db.query<UserRow>(query, params)
    if (result.rows[0]) {
      return this.mapUserRow(result.rows[0])
    }

    throw new Error("User creation data didn't persist in the database")
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

    return result.rowCount === 1
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
      const res = await this.getUserScores(userId)
      if (!res) {
        throw new Error('Failed to persist the update data')
      }

      return res
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
      throw new Error('Failed to persist the update data')
    }

    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to persist the update data')
    }

    const res = normalizeScores(row.scores)
    if (!res) {
      throw new Error('Failed to persist the update data')
    }

    return res
  }

  async getUserSubmissions(userId: string): Promise<ShortSubmission[] | null> {
    const result = await this.db.query<Last5SubmissionsRow>(
      'SELECT last_5_submissions FROM users WHERE id = $1 LIMIT 1',
      [userId],
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return normalizeShortSubmissions(row.last_5_submissions)
  }

  async getLast5Submissions(userId: string): Promise<ShortSubmission[] | null> {
    const result = await this.db.query<Last5SubmissionsRow>(
      'SELECT last_5_submissions FROM users WHERE id = $1 LIMIT 1',
      [userId],
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    if (!row) {
      return null
    }

    const submissions = normalizeShortSubmissions(row.last_5_submissions)
    if (!submissions) {
      return null
    }

    return submissions.slice(-5)
  }

  async setSubmissionsInProfile(userId: string, payload: Partial<ShortSubmission[]>): Promise<ShortSubmission[]> {
    const result = await this.db.query<Last5SubmissionsRow>(
      `
        UPDATE users
        SET last_5_submissions = $2::jsonb[]
        WHERE id = $1
        RETURNING last_5_submissions
      `,
      [userId, toShortSubmissionJsonArray(payload)],
    )

    if (result.rows.length === 0) {
      throw new Error('Failed to persist the update data')
    }

    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to persist the update data')
    }

    const submissions = normalizeShortSubmissions(row.last_5_submissions)
    if (!submissions) {
      throw new Error('Failed to persist the update data')
    }

    return submissions
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
      return false
    }

    const row = result.rows[0]
    if (!row) {
      return false
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

    throw new Error('Failed to persist update change')
  }

  private buildFilterClause(filters: Partial<User>): { whereClause: string; params: unknown[] } {
    const clauses: string[] = []
    const params: unknown[] = []

    if (filters === undefined || filters === null) {
      return {
        whereClause: '',
        params: [],
      }
    }

    for (const [rawKey, rawValue] of Object.entries(filters)) {
      if (rawValue === undefined) {
        continue
      }

      if (!FILTERABLE_COLUMNS.has(rawKey as keyof User)) {
        continue
      }

      const key = rawKey as keyof User

      switch (key) {
        case 'scores': {
          params.push(extractJsonPatch(rawValue))
          clauses.push(`${key} IS NOT DISTINCT FROM $${params.length}::jsonb`)
          break
        }
        case 'last_5_submissions': {
          params.push(toShortSubmissionJsonArray(rawValue))
          clauses.push(`${key} IS NOT DISTINCT FROM $${params.length}::jsonb[]`)
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
          }
          else {
            params.push(extractJsonPatch(rawValue))
            setClauses.push(`scores = CASE WHEN scores IS NULL THEN $${params.length}::jsonb ELSE scores || $${params.length}::jsonb END`)
          }
          break
        }
        case 'last_5_submissions': {
          if (rawValue === null) {
            setClauses.push('last_5_submissions = NULL')
          }
          else {
            params.push(toShortSubmissionJsonArray(rawValue))
            setClauses.push(`last_5_submissions = $${params.length}::jsonb[]`)
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
      const res = await this.findById(userId)
      if (!res) {
        throw new Error("Nothing to update, but couldn't find user profile")
      }

      return res
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

    throw new Error("Couldn't persist User data update in database")
  }

  private mapUserRow(row: UserRow): User {
    const user = new User()
    user.id = row.id
    user.email = row.email
    user.first_name = row.first_name ?? undefined
    user.last_name = row.last_name ?? undefined
    user.role = row.role
    user.banned = row.banned
    user.scores = normalizeScores(row.scores)
    user.created_at = toIsoString(row.created_at)
    user.last_5_submissions = normalizeShortSubmissions(row.last_5_submissions)
    user.email_verified = row.email_verified
    user.email_notifications_enabled = row.email_notifications_enabled
    return user
  }
}
