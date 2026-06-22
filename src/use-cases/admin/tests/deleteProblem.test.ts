import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import InternalServerError from '../../../errors/internalServerError.js';
import DeleteProblem from '../deleteProblem.js';
import type IProblemDAO from '../../../interfaces/problem/problemDAO.js';

describe('DeleteProblem', () => {
  let deleteProblemDAO: jest.MockedFunction<IProblemDAO['delete']>;
  let problemDAO: IProblemDAO;
  let deleteProblem: DeleteProblem;

  beforeEach(() => {
    deleteProblemDAO = jest.fn<IProblemDAO['delete']>();
    problemDAO = { delete: deleteProblemDAO } as unknown as IProblemDAO;
    deleteProblem = new DeleteProblem(problemDAO);
  });

  describe('successful deletion', () => {
    it('returns true when the DAO deletes the problem successfully', async () => {
      // Arrange
      deleteProblemDAO.mockResolvedValueOnce(true);

      // Act
      const result = await deleteProblem.call('problem-123');

      // Assert
      expect(deleteProblemDAO).toHaveBeenCalledTimes(1);
      expect(deleteProblemDAO).toHaveBeenCalledWith('problem-123');
      expect(result).toBe(true);
    });

    it('returns false when the DAO reports that nothing was deleted', async () => {
      // Arrange
      deleteProblemDAO.mockResolvedValueOnce(false);

      // Act
      const result = await deleteProblem.call('problem-123');

      // Assert
      expect(deleteProblemDAO).toHaveBeenCalledTimes(1);
      expect(deleteProblemDAO).toHaveBeenCalledWith('problem-123');
      expect(result).toBe(false);
    });

    it.each([
      ['a normal problem id', 'problem-123'],
      ['an empty problem id', ''],
      ['a whitespace problem id', '   '],
      ['a long problem id', 'problem-' + 'x'.repeat(64)],
      ['a unicode problem id', 'problem-Δειγμα'],
      ['a numeric-looking problem id', '000123'],
    ])('forwards %s unchanged to the DAO', async (_label, problemId) => {
      // Arrange
      deleteProblemDAO.mockResolvedValueOnce(true);

      // Act
      const result = await deleteProblem.call(problemId);

      // Assert
      expect(deleteProblemDAO).toHaveBeenCalledTimes(1);
      expect(deleteProblemDAO).toHaveBeenCalledWith(problemId);
      expect(result).toBe(true);
    });
  });

  describe('dao failure', () => {
    it('wraps an Error thrown by the DAO in an InternalServerError and keeps the original error', async () => {
      // Arrange
      const originalError = new Error('database unavailable');
      deleteProblemDAO.mockRejectedValueOnce(originalError);

      // Act
      const promise = deleteProblem.call('problem-123');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to delete the problem in the DB',
        httpStatusCode: 500,
        originalError,
      });
      expect(deleteProblemDAO).toHaveBeenCalledTimes(1);
      expect(deleteProblemDAO).toHaveBeenCalledWith('problem-123');
    });

    it('wraps a non-Error rejection from the DAO in an InternalServerError and keeps the original value', async () => {
      // Arrange
      const originalError = 'database failure';
      deleteProblemDAO.mockRejectedValueOnce(originalError);

      // Act
      const promise = deleteProblem.call('problem-123');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to delete the problem in the DB',
        httpStatusCode: 500,
        originalError,
      });
      expect(deleteProblemDAO).toHaveBeenCalledTimes(1);
      expect(deleteProblemDAO).toHaveBeenCalledWith('problem-123');
    });

    it.each([
      ['empty string id', ''],
      ['whitespace id', '   '],
    ])('still wraps DAO failures for %s', async (_label, problemId) => {
      // Arrange
      const originalError = new Error('database unavailable');
      deleteProblemDAO.mockRejectedValueOnce(originalError);

      // Act
      const promise = deleteProblem.call(problemId);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to delete the problem in the DB',
        httpStatusCode: 500,
        originalError,
      });
      expect(deleteProblemDAO).toHaveBeenCalledWith(problemId);
    });
  });
});
