import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { PoolClient } from 'pg'

const query = jest.fn()
await jest.unstable_mockModule('../client.js', () => ({
  default: { query },
}))

const { default: UserDAO } = await import('../userDAO.js')
import User from '../../../entities/user.js'
import ShortSubmission from '../../../entities/shortSubmission.js'
import UserScores from '../../../entities/userScores.js'

type MockDbClient = Pick<PoolClient, 'query'>

function expectDefaultTopicRatings(topicRatings: UserScores['topic_ratings'] | undefined): void {
  if (!topicRatings) {
    throw new Error('Expected topic ratings to be present')
  }

  const normalized = topicRatings as Record<string, number>

  expect(normalized).toMatchObject({
    array: 0,
    math: 0,
    depthFirstSearch: 0,
    dynamicProgramming: 0,
    graph: 0,
    twoPointers: 0,
    countingSort: 0,
  })
  expect(Object.values(normalized).every((value) => value === 0)).toBe(true)
}

function createUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-123',
    email: 'user@example.com',
    first_name: 'Ada',
    last_name: 'Lovelace',
    role: 'user' as const,
    banned: false,
    scores: {
      approaches_score: 10,
      consistency_score: 20,
      edge_case_score: 30,
      days_logged_in: ['2026-01-01T00:00:00.000Z'],
    },
    created_at: new Date('2026-01-02T00:00:00.000Z'),
    last_5_submissions: [
      {
        submission_id: 'submission-1',
        problem_id: 'problem-1',
        difficulty: 'medium',
        timer: null,
        approach_score: 8,
        identified_approach: 'Greedy',
        pass: true,
        edge_case_score: 7,
        submitted_at: '2026-01-02T00:00:00.000Z',
      },
    ],
    email_verified: true,
    email_notifications_enabled: true,
    ...overrides,
  }
}

function createShortSubmission(index: number) {
  return {
    submission_id: `submission-${index}`,
    problem_id: 'problem-1',
    difficulty: 'medium',
    timer: null,
    approach_score: index,
    identified_approach: `approach-${index}`,
    pass: index % 2 === 0,
    edge_case_score: index,
    submitted_at: `2026-01-${String(index).padStart(2, '0')}T00:00:00.000Z`,
  }
}

describe('UserDAO', () => {
  let db: MockDbClient
  let dao: InstanceType<typeof UserDAO>

  beforeEach(() => {
    query.mockReset()
    db = { query } as unknown as MockDbClient
    dao = new UserDAO(db)
  })

  it('returns null when findById does not find a row', async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    await expect(dao.findById('user-123')).resolves.toBeNull()
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM users WHERE id = $1 LIMIT 1'),
      ['user-123'],
    )
  })

  it('maps a found row into a User instance', async () => {
    query.mockResolvedValueOnce({ rows: [createUserRow()], rowCount: 1 })

    const result = await dao.findById('user-123')

    expect(result).toBeInstanceOf(User)
    expect(result).toMatchObject({
      id: 'user-123',
      email: 'user@example.com',
      first_name: 'Ada',
      last_name: 'Lovelace',
      role: 'user',
      banned: false,
      created_at: '2026-01-02T00:00:00.000Z',
      email_verified: true,
      email_notifications_enabled: true,
    })
    expect(result?.scores).toBeInstanceOf(UserScores)
    expect(result?.scores).toMatchObject({
      approaches_score: 10,
      consistency_score: 20,
      edge_case_score: 30,
      initial_elo_rating: 1500,
      elo_rating: 1500,
      total_score: 60,
      days_logged_in: ['2026-01-01T00:00:00.000Z'],
    })
    expectDefaultTopicRatings(result?.scores?.topic_ratings)
    expect(result?.last_5_submissions?.[0]).toBeInstanceOf(ShortSubmission)
    expect(result?.last_5_submissions?.[0]).toMatchObject({
      submission_id: 'submission-1',
      problem_id: 'problem-1',
      difficulty: 'medium',
      pass: true,
      edge_case_score: 7,
    })
  })

  it('returns a paginated payload with an empty data array when no users match', async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    const result = await dao.findAll({ banned: true }, 3, 25)

    expect(result).toEqual({
      data: [],
      pagination: {
        page: 3,
        perPage: 25,
      },
    })
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM users'),
      [true, 25, 50],
    )
  })

  it('merges score patches and normalizes the returned score object', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          scores: {
            approaches_score: 50,
            consistency_score: 20,
            edge_case_score: 10,
            days_logged_in: ['2026-01-01T00:00:00.000Z'],
          },
        },
      ],
      rowCount: 1,
    })

    const result = await dao.setUserScores('user-123', {
      approaches_score: 50,
    })

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users'),
      ['user-123', { approaches_score: 50 }],
    )
    expect(result).toMatchObject({
      initial_elo_rating: 1500,
      elo_rating: 1500,
      approaches_score: 50,
      consistency_score: 20,
      edge_case_score: 10,
      total_score: 80,
      days_logged_in: ['2026-01-01T00:00:00.000Z'],
    })
    expectDefaultTopicRatings(result.topic_ratings)
  })

  it('returns true for a deleted row and false when nothing was deleted', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'user-123' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })

    await expect(dao.delete('user-123')).resolves.toBe(true)
    await expect(dao.delete('missing-user')).resolves.toBe(false)
  })

  it('returns the last five submissions in order', async () => {
    query.mockResolvedValueOnce({
      rows: [{ last_5_submissions: Array.from({ length: 6 }, (_v, index) => createShortSubmission(index + 1)) }],
      rowCount: 1,
    })

    const result = await dao.getLast5Submissions('user-123')

    expect(result).toHaveLength(5)
    expect(result?.[0]).toBeInstanceOf(ShortSubmission)
    expect(result?.[0]?.submission_id).toBe('submission-2')
    expect(result?.[4]?.submission_id).toBe('submission-6')
  })

  it('overwrites the profile submissions column and returns the stored array', async () => {
    const submissions = [
      createShortSubmission(1),
      createShortSubmission(2),
    ]

    query.mockResolvedValueOnce({
      rows: [{ last_5_submissions: submissions }],
      rowCount: 1,
    })

    const result = await dao.setSubmissionsInProfile('user-123', submissions)

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SET last_5_submissions = $2'),
      ['user-123', submissions],
    )
    expect(result).toHaveLength(2)
    expect(result[0]).toBeInstanceOf(ShortSubmission)
    expect(result[0]).toMatchObject({
      submission_id: 'submission-1',
      problem_id: 'problem-1',
      difficulty: 'medium',
    })
  })

  it('returns the boolean value from toggleEmailNotifications', async () => {
    query.mockResolvedValueOnce({
      rows: [{ email_notifications_enabled: false }],
      rowCount: 1,
    })

    await expect(dao.toggleEmailNotifications('user-123', false)).resolves.toBe(false)
  })

  it('returns false from toggleEmailNotifications when no row is updated', async () => {
    query.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    })

    await expect(dao.toggleEmailNotifications('missing-user', true)).resolves.toBe(false)
  })
})
