import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import Problem from '../../../entities/problem.js';
import InternalServerError from '../../../errors/internalServerError.js';
import ValidationError from '../../../errors/validationError.js';
import type IPaginated from '../../../interfaces/paginated.js';
import type IProblemDAO from '../../../interfaces/problem/problemDAO.js';
import ListProblems from '../listProblems.js';

function createProblem(overrides: Partial<Problem> = {}): Problem {
  return Object.assign(new Problem(), {
    id: 'problem-123',
    title: 'Sample Problem',
    description: 'Solve the sample problem',
    testCases: ['input -> output'],
    approaches: [],
    evaluation_criteria: ['Correctness'],
    difficulty: 1 as const,
    ...overrides,
  });
}

function createPaginatedProblems(
  data: Problem[],
  page: number,
  perPage: number,
): IPaginated<Problem> {
  return {
    data,
    pagination: { page, perPage },
  };
}

describe('ListProblems', () => {
  let list: jest.MockedFunction<IProblemDAO['list']>;
  let problemDAO: IProblemDAO;
  let listProblems: ListProblems;

  beforeEach(() => {
    list = jest.fn<IProblemDAO['list']>();
    problemDAO = { list } as unknown as IProblemDAO;
    listProblems = new ListProblems(problemDAO);
  });

  describe('successful listing', () => {
    it('returns paginated problems when called with defaults', async () => {
      // Arrange
      const problems = [
        createProblem({ id: 'problem-1', title: 'Two Sum' }),
        createProblem({ id: 'problem-2', title: 'Reverse String' }),
      ];
      const expected = createPaginatedProblems(problems, 1, 10);
      list.mockResolvedValueOnce(expected);

      // Act
      const result = await listProblems.call();

      // Assert
      expect(list).toHaveBeenCalledTimes(1);
      expect(list).toHaveBeenCalledWith({}, 1, 10);
      expect(result).toBe(expected);
      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({ page: 1, perPage: 10 });
    });

    it('returns the exact DAO result for a custom positive page and perPage', async () => {
      // Arrange
      const expected = createPaginatedProblems(
        [createProblem({ id: 'problem-1', title: 'Two Sum' })],
        3,
        25,
      );
      list.mockResolvedValueOnce(expected);

      // Act
      const result = await listProblems.call(3, 25);

      // Assert
      expect(list).toHaveBeenCalledTimes(1);
      expect(list).toHaveBeenCalledWith({}, 3, 25);
      expect(result).toBe(expected);
    });

    it('uses the default perPage value when only page is provided', async () => {
      // Arrange
      const expected = createPaginatedProblems([], 5, 10);
      list.mockResolvedValueOnce(expected);

      // Act
      const result = await listProblems.call(5);

      // Assert
      expect(list).toHaveBeenCalledTimes(1);
      expect(list).toHaveBeenCalledWith({}, 5, 10);
      expect(result.pagination).toEqual({ page: 5, perPage: 10 });
    });

    it.each([
      ['page=1 and perPage=1', 1, 1],
      ['page=1 and perPage=50', 1, 50],
      ['page=99 and perPage=1', 99, 1],
    ])('accepts %s', async (_label, page, perPage) => {
      // Arrange
      const expected = createPaginatedProblems([], page, perPage);
      list.mockResolvedValueOnce(expected);

      // Act
      const result = await listProblems.call(page, perPage);

      // Assert
      expect(list).toHaveBeenCalledWith({}, page, perPage);
      expect(result).toBe(expected);
    });
  });

  describe('validation', () => {
    it.each([
      ['page is 0', 0, 10],
      ['page is negative', -1, 10],
      ['page is decimal', 1.5, 10],
      ['page is NaN', Number.NaN, 10],
      ['page is Infinity', Number.POSITIVE_INFINITY, 10],
      ['page is -Infinity', Number.NEGATIVE_INFINITY, 10],
      ['perPage is 0', 1, 0],
      ['perPage is negative', 1, -10],
      ['perPage is decimal', 1, 2.5],
      ['perPage is NaN', 1, Number.NaN],
      ['perPage is Infinity', 1, Number.POSITIVE_INFINITY],
      ['perPage is -Infinity', 1, Number.NEGATIVE_INFINITY],
      ['both are invalid', 0, 0],
      ['both are decimals', 1.1, 2.2],
    ])('rejects when %s', async (_label, page, perPage) => {
      // Act
      const promise = listProblems.call(page, perPage);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Page and perPage must be positive whole integers',
        httpStatusCode: 400,
      });
      expect(list).not.toHaveBeenCalled();
    });

    it('wraps a validator-free DAO call only after both values pass the guard', async () => {
      // Arrange
      const expected = createPaginatedProblems([], 2, 20);
      list.mockResolvedValueOnce(expected);

      // Act
      const result = await listProblems.call(2, 20);

      // Assert
      expect(list).toHaveBeenCalledWith({}, 2, 20);
      expect(result).toBe(expected);
    });
  });

  describe('dao failure', () => {
    it('wraps an Error thrown by the DAO in an InternalServerError', async () => {
      // Arrange
      list.mockRejectedValueOnce(new Error('database unavailable'));

      // Act
      const promise = listProblems.call(1, 10);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error while fetching problems from DB',
        httpStatusCode: 500,
      });
      expect(list).toHaveBeenCalledTimes(1);
      expect(list).toHaveBeenCalledWith({}, 1, 10);
    });

    it('wraps a non-Error rejection from the DAO in an InternalServerError', async () => {
      // Arrange
      list.mockRejectedValueOnce('raw string rejection');

      // Act
      const promise = listProblems.call(1, 10);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error while fetching problems from DB',
        httpStatusCode: 500,
      });
      expect(list).toHaveBeenCalledTimes(1);
      expect(list).toHaveBeenCalledWith({}, 1, 10);
    });
  });
});
