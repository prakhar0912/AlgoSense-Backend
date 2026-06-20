/**
 * @file src/use-cases/user/tests/getProblem.test.ts
 * @description Jest unit tests for the GetProblem use‑case.
 * Uses the AAA (Arrange‑Act‑Assert) pattern and strict TypeScript typings.
 */

import { describe, it, expect, afterEach, jest, beforeEach } from '@jest/globals';
import GetProblem from '../../user/getProblem.js';
import type Problem from '../../../entities/problem.js';
import type IProblemDAO from '../../../interfaces/problem/problemDAO.js';
import { ValidationError } from '../../../errors/index.js';
import InternalServerError from '../../../errors/internalServerError.js';
import NotFoundError from '../../../errors/notFoundError.js';

// ---- Helpers --------------------------------------------------------------

/**
 * Creates a minimal valid Problem instance for tests.
 */
function makeFakeProblem(overrides?: Partial<Problem>): Problem {
  const base: Problem = {
    // Assuming the Problem entity has the following required fields.
    // Adjust if the actual definition differs.
    title: 'Sample problem',
    description: 'A simple test problem',
    testCases: [],
    approaches: [],
    evaluation_criteria: [],
    difficulty: 1,
    ...overrides,
  } as Problem;
  return base;
}

// ---------------------------------------------------------------------------

afterEach(() => {
  jest.restoreAllMocks(); // Reset all mocked implementations between tests.
});

describe('GetProblem Use‑Case', () => {
  let mockProblemDAO: jest.Mocked<IProblemDAO>;
  let getProblem: GetProblem;

  beforeEach(() => {
    // Create a mocked DAO with Jest's typed mock helpers.
    mockProblemDAO = {
      findById: jest.fn(),
      // The DAO interface may define other methods; they are not needed here.
    } as unknown as jest.Mocked<IProblemDAO>;

    // Inject the mock into the use‑case.
    getProblem = new GetProblem(mockProblemDAO);
  });

  // -----------------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------------
  it('should return a problem when a valid ID is provided', async () => {
    // Arrange
    const problemId = 'valid-id-123';
    const fakeProblem = makeFakeProblem({ title: 'Test Problem' });
    mockProblemDAO.findById.mockResolvedValueOnce(fakeProblem);

    // Act
    const result = await getProblem.call(problemId);

    // Assert
    expect(mockProblemDAO.findById).toHaveBeenCalledTimes(1);
    expect(mockProblemDAO.findById).toHaveBeenCalledWith(problemId);
    expect(result).toBe(fakeProblem);
  });

  // -----------------------------------------------------------------------
  // Unhappy paths
  // -----------------------------------------------------------------------

  it('should throw ValidationError when problemId is not a string', async () => {
    // Arrange
    const invalidId: any = 12345; // deliberately non‑string

    // Act & Assert
    await expect(getProblem.call(invalidId)).rejects.toThrow(ValidationError);
    await expect(getProblem.call(invalidId)).rejects.toMatchObject({
      message: 'Problem ID must be a valid string',
    });
    expect(mockProblemDAO.findById).not.toHaveBeenCalled();
  });

  it('should wrap DAO errors in InternalServerError', async () => {
    // Arrange
    const problemId = 'any-id';
    const daoError = new Error('DB connection failed');
    mockProblemDAO.findById.mockRejectedValueOnce(daoError);

    // Act & Assert
    // await expect(getProblem.call(problemId)).rejects.toThrow(InternalServerError);
    await expect(getProblem.call(problemId)).rejects.toMatchObject(
      new InternalServerError(
        'Unable to fetch problem from DB',
      ) as never,
    );
    expect(mockProblemDAO.findById).toHaveBeenCalledTimes(1);
  });

  it('should throw NotFoundError when DAO returns null/undefined', async () => {
    // Arrange
    const problemId = 'missing-id';
    mockProblemDAO.findById.mockResolvedValueOnce(null);

    // Act & Assert
    // await expect(getProblem.call(problemId)).rejects.toThrow(NotFoundError);
    await expect(getProblem.call(problemId)).rejects.toMatchObject(
      new NotFoundError(
        'Problem not found in DB',
      ) as never,
    );
    expect(mockProblemDAO.findById).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  it('should treat an empty string as a valid ID and still hit NotFoundError', async () => {
    // Arrange
    const emptyId = '';
    mockProblemDAO.findById.mockResolvedValueOnce(undefined);

    // Act & Assert
    await expect(getProblem.call(emptyId)).rejects.toThrow(NotFoundError);
    expect(mockProblemDAO.findById).toHaveBeenCalledWith(emptyId);
  });

  it('should not call DAO multiple times for a single request', async () => {
    // Arrange
    const problemId = 'single-call-id';
    const fakeProblem = makeFakeProblem();
    mockProblemDAO.findById.mockResolvedValueOnce(fakeProblem);

    // Act
    const result = await getProblem.call(problemId);

    // Assert
    expect(result).toBe(fakeProblem);
    expect(mockProblemDAO.findById).toHaveBeenCalledTimes(1);
  });
});
