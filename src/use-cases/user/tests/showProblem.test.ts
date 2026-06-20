import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import Problem from '../../../entities/problem.js';
import NotFoundError from '../../../errors/notFoundError.js';
import ValidationError from '../../../errors/validationError.js';
import InternalServerError from '../../../errors/internalServerError.js';
import ShowProblem from '../showProblem.js';
import type IProblemDAO from '../../../interfaces/problem/problemDAO.js';

function createProblem(overrides: Partial<Problem> = {}): Problem {
  return Object.assign(new Problem(), {
    id: 'problem-123',
    title: 'Sample Problem',
    description: 'Solve the sample problem',
    testCases: ['input -> output'],
    difficulty: 1 as const,
    approaches: [],
    evaluation_criteria: ['Correctness'],
    ...overrides,
  });
}

describe('ShowProblem', () => {
  let findById: jest.MockedFunction<IProblemDAO['findById']>;
  let problemDAO: IProblemDAO;
  let showProblem: ShowProblem;

  beforeEach(() => {
    findById = jest.fn<IProblemDAO['findById']>();
    problemDAO = { findById } as unknown as IProblemDAO;
    showProblem = new ShowProblem(problemDAO);
  });

  describe('successful retrieval', () => {
    it('returns the exact problem returned by the DAO', async () => {
      // Arrange
      const problem = createProblem();
      findById.mockResolvedValueOnce(problem);

      // Act
      const result = await showProblem.call('problem-123');

      // Assert
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith('problem-123');
      expect(result).toBe(problem);
    });
  });

  describe('input validation', () => {
    it.each([
      ['an empty string', ''],
      ['a number', 123],
      ['a boolean', false],
      ['null', null],
      ['undefined', undefined],
      ['an object', { id: 'problem-123' }],
      ['an array', ['problem-123']],
      ['a symbol', Symbol('problem-id')],
      ['a bigint', 10n],
      ['a function', () => 'problem-123'],
    ])('rejects %s before calling the DAO', async (_label, problemId) => {
      // Act
      const promise = showProblem.call(problemId as never);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Problem ID value not provided',
        httpStatusCode: 400,
      });
      expect(findById).not.toHaveBeenCalled();
    });
  });

  describe('DAO lookup', () => {
    it('wraps an Error thrown by the DAO in an InternalServerError', async () => {
      // Arrange
      findById.mockRejectedValueOnce(new Error('database unavailable'));

      // Act
      const promise = showProblem.call('problem-123');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error while fetching problem from DB',
        httpStatusCode: 500,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith('problem-123');
    });

    it('wraps a non-Error rejection from the DAO in an InternalServerError', async () => {
      // Arrange
      findById.mockRejectedValueOnce('database failure');

      // Act
      const promise = showProblem.call('problem-123');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error while fetching problem from DB',
        httpStatusCode: 500,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith('problem-123');
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
    ])('rejects when the DAO returns %s', async (_label, problem) => {
      // Arrange
      findById.mockResolvedValueOnce(problem as Problem | null);

      // Act
      const promise = showProblem.call('problem-123');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'NotFoundError',
        message: 'Problem was not found',
        httpStatusCode: 404,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith('problem-123');
    });
  });
});
