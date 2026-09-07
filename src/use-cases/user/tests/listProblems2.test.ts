import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { Problem } from '../../../entities/index.js';
import { InternalServerError, ValidationError } from '../../../errors/index.js';
import type IPaginated from '../../../interfaces/paginated.js';
import type IProblemDAO from '../../../interfaces/problem/problemDAO.js';
import ListProblemsForUser from '../listProblems.js';

type PublicProblem = Omit<Problem, 'approaches' | 'hints' | 'evaluation_criteria'>;

function createProblem(overrides: Partial<Problem> = {}): Problem {
  return Object.assign(new Problem(), {
    id: 'problem-123',
    title: 'Two Sum',
    description: 'Find two numbers that add up to a target value.',
    rating: 4.5,
    slug: 'two-sum',
    hints: ['Try using a map'],
    primary_topics: ['hashTable'],
    secondary_topics: ['array'],
    similar_problems: ['three-sum'],
    difficulty: 'medium' as const,
    approaches: [],
    evaluation_criteria: ['Correctness'],
    ...overrides,
  });
}

function createPublicProblem(overrides: Partial<PublicProblem> = {}): PublicProblem {
  const { approaches, hints, evaluation_criteria, ...publicProblem } = createProblem(
    overrides as Partial<Problem>,
  );

  return publicProblem;
}

function createPaginatedProblems(
  data: PublicProblem[],
  page: number,
  perPage: number,
): IPaginated<PublicProblem> {
  return {
    data,
    pagination: { page, perPage },
  };
}

describe('ListProblemsForUser', () => {
  let listForUser: jest.MockedFunction<IProblemDAO['listForUser']>;
  let listProblemsForUser: ListProblemsForUser;

  beforeEach(() => {
    listForUser = jest.fn<IProblemDAO['listForUser']>();

    const problemDAO = {
      listForUser,
    } as unknown as IProblemDAO;

    listProblemsForUser = new ListProblemsForUser(problemDAO);
  });

  it('returns paginated public problems with default filters and pagination', async () => {
    // Arrange
    const expected = createPaginatedProblems(
      [
        createPublicProblem({ id: 'problem-1', title: 'Alpha', slug: 'alpha' }),
        createPublicProblem({ id: 'problem-2', title: 'Beta', slug: 'beta' }),
      ],
      1,
      10,
    );
    listForUser.mockResolvedValueOnce(expected);

    // Act
    const result = await listProblemsForUser.call();

    // Assert
    expect(listForUser).toHaveBeenCalledTimes(1);
    expect(listForUser).toHaveBeenCalledWith({}, 1, 10);
    expect(result).toBe(expected);
    expect(result.pagination).toEqual({ page: 1, perPage: 10 });
    expect(result.data[0]).not.toHaveProperty('hints');
    expect(result.data[0]).not.toHaveProperty('approaches');
    expect(result.data[0]).not.toHaveProperty('evaluation_criteria');
  });

  it('forwards supplied filters and explicit pagination to the DAO', async () => {
    // Arrange
    const filters = {
      title: 'Alpha',
      slug: 'alpha',
      difficulty: 'medium' as const,
      similar_problems: ['two-sum-ii'],
    };
    const expected = createPaginatedProblems(
      [createPublicProblem({ id: 'problem-7', title: 'Alpha', slug: 'alpha' })],
      3,
      25,
    );
    listForUser.mockResolvedValueOnce(expected);

    // Act
    const result = await listProblemsForUser.call(filters, 3, 25);

    // Assert
    expect(listForUser).toHaveBeenCalledTimes(1);
    expect(listForUser).toHaveBeenCalledWith(filters, 3, 25);
    expect(result).toBe(expected);
  });

  it('uses the default empty filters object when undefined is passed explicitly', async () => {
    // Arrange
    const expected = createPaginatedProblems([], 5, 10);
    listForUser.mockResolvedValueOnce(expected);

    // Act
    const result = await listProblemsForUser.call(undefined, 5);

    // Assert
    expect(listForUser).toHaveBeenCalledTimes(1);
    expect(listForUser).toHaveBeenCalledWith({}, 5, 10);
    expect(result).toBe(expected);
  });

  it.each([
    ['page is zero', 0, 10],
    ['page is negative', -1, 10],
    ['page is decimal', 1.5, 10],
    ['page is positive infinity', Number.POSITIVE_INFINITY, 10],
    ['perPage is zero', 1, 0],
    ['perPage is negative', 1, -10],
    ['perPage is decimal', 1, 2.5],
    ['perPage is NaN', 1, Number.NaN],
  ])('throws ValidationError when %s', async (_label, page, perPage) => {
    // Arrange
    const filters = { difficulty: 'easy' as const };

    // Act
    const promise = listProblemsForUser.call(filters, page, perPage);

    // Assert
    await expect(promise).rejects.toBeInstanceOf(ValidationError);
    await expect(promise).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'Page and perPage must be positive whole integers',
      httpStatusCode: 400,
    });
    expect(listForUser).not.toHaveBeenCalled();
  });

  it('wraps DAO Error rejections in an InternalServerError', async () => {
    // Arrange
    const filters = { difficulty: 'hard' as const, slug: 'graph-paths' };
    listForUser.mockRejectedValueOnce(new Error('database unavailable'));

    // Act
    const promise = listProblemsForUser.call(filters, 2, 15);

    // Assert
    await expect(promise).rejects.toBeInstanceOf(InternalServerError);
    await expect(promise).rejects.toMatchObject({
      name: 'InternalServerError',
      message: 'Error while fetching problems from DB',
      httpStatusCode: 500,
    });
    expect(listForUser).toHaveBeenCalledTimes(1);
    expect(listForUser).toHaveBeenCalledWith(filters, 2, 15);
  });

  it('wraps non-Error DAO rejections in an InternalServerError', async () => {
    // Arrange
    const filters = { title: 'Beta' };
    listForUser.mockRejectedValueOnce('raw rejection' as never);

    // Act
    const promise = listProblemsForUser.call(filters, 1, 20);

    // Assert
    await expect(promise).rejects.toBeInstanceOf(InternalServerError);
    await expect(promise).rejects.toMatchObject({
      name: 'InternalServerError',
      message: 'Error while fetching problems from DB',
      httpStatusCode: 500,
    });
    expect(listForUser).toHaveBeenCalledTimes(1);
    expect(listForUser).toHaveBeenCalledWith(filters, 1, 20);
  });
});
