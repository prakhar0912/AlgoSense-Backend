// @ts-check   // enables TypeScript‑like checking without a full tsconfig

import { describe, expect, it, beforeEach, jest } from '@jest/globals';

import UpdateConsistencyScore from '../updateConsistencyScore.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
import InternalServerError from '../../../errors/internalServerError.js';
import type UserScores from '../../../entities/userScores.js';

describe('UpdateConsistencyScore use‑case', () => {
  // ---- test‑doubles -------------------------------------------------------
  let userDAO: jest.Mocked<IUserDAO>;
  let firstLoginToday: jest.Mock<(daysLoggedIn: string[]) => boolean>;
  let getConsistencyScore: jest.Mock<(daysLoggedIn: string[]) => number>;
  let useCase: UpdateConsistencyScore;

  // ---- constants used in multiple tests ----------------------------------
  const TEST_USER_ID = 'user-123';
  const TODAY_ISO = new Date().toISOString().split('.')[0] + 'Z';

  beforeEach(() => {
    // DAO mock – only the method we use needs to be mocked
    userDAO = {
      setUserScores: jest.fn(),
      // the rest of the IUserDAO interface is not touched by this use‑case,
      // but we must provide the shape to satisfy TypeScript.
      create: jest.fn(),
      update: jest.fn(),
      updatePassword: jest.fn(),
      delete: jest.fn(),
      findForAuth: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      toggleBanUser: jest.fn(),
      unbanUser: jest.fn(),
      getUserScores: jest.fn(),
      getUserSubmissions: jest.fn(),
      getLast5Submissions: jest.fn(),
      answer: jest.fn(),
      viewProfile: jest.fn(),
      resetPassword: jest.fn(),
      verifyEmail: jest.fn(),
      toggleEmailNotifications: jest.fn(),
    } as unknown as jest.Mocked<IUserDAO>;

    // function mocks injected via the constructor
    firstLoginToday = jest.fn();
    getConsistencyScore = jest.fn();

    // instantiate the use‑case with fresh mocks for each test
    useCase = new UpdateConsistencyScore(userDAO, firstLoginToday, getConsistencyScore);

    // clear call history between tests
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Happy‑path scenarios
  // -----------------------------------------------------------------------
  describe('#call() – when userScores is falsy (null/undefined)', () => {
    it('should add today’s date, compute consistencyScore and persist the new scores', async () => {
      // Arrange
      const mockScoreFromFn = 42;
      getConsistencyScore.mockReturnValueOnce(mockScoreFromFn);
      const persistedScores = {
        approaches_score: 0,
        consistency_score: mockScoreFromFn,
        edge_case_score: 0,
        total_score: 0,
        days_logged_in: [TODAY_ISO],
      } as UserScores;
      userDAO.setUserScores.mockResolvedValueOnce(persistedScores);

      // Act
      const result = await useCase.call(TEST_USER_ID, null as unknown as UserScores);

      // Assert
      expect(firstLoginToday).not.toHaveBeenCalled();
      expect(getConsistencyScore).toHaveBeenCalledWith([TODAY_ISO]);
      expect(getConsistencyScore).toHaveBeenCalledTimes(1);
      expect(userDAO.setUserScores).toHaveBeenCalledWith(TEST_USER_ID, {
        consistency_score: mockScoreFromFn,
        days_logged_in: [TODAY_ISO],
      });
      expect(userDAO.setUserScores).toHaveBeenCalledTimes(1);
      expect(result).toEqual(persistedScores);
    });
  });

  describe('#call() – when userScores exists and firstLoginToday returns true', () => {
    it('should append today’s date, recompute consistencyScore and persist the new scores', async () => {
      // Arrange
      const existingScores: UserScores = {
        approaches_score: 5,
        consistency_score: 10,
        edge_case_score: 3,
        total_score: 18,
        days_logged_in: ['2024-01-01T00:00:00.000Z', '2024-01-02T00:00:00.000Z'],
      };
      const mockScoreFromFn = 99;
      getConsistencyScore.mockReturnValueOnce(mockScoreFromFn);
      const persistedScores = {
        ...existingScores,
        consistency_score: mockScoreFromFn,
        days_logged_in: [
          ...existingScores.days_logged_in,
          TODAY_ISO,
        ],
      } as UserScores;
      userDAO.setUserScores.mockResolvedValueOnce(persistedScores);
      firstLoginToday.mockReturnValueOnce(true); // simulate “first login today”

      // Act
      const result = await useCase.call(TEST_USER_ID, existingScores);

      // Assert
      expect(firstLoginToday).toHaveBeenCalledWith(existingScores.days_logged_in);
      expect(firstLoginToday).toHaveBeenCalledTimes(1);
      expect(getConsistencyScore).toHaveBeenCalledWith(existingScores.days_logged_in);
      expect(getConsistencyScore).toHaveBeenCalledTimes(1);
      expect(userDAO.setUserScores).toHaveBeenCalledWith(TEST_USER_ID, {
        consistency_score: mockScoreFromFn,
        days_logged_in: existingScores.days_logged_in,
      });
      expect(userDAO.setUserScores).toHaveBeenCalledTimes(1);
      expect(result).toEqual(persistedScores);
    });
  });

  // -----------------------------------------------------------------------
  // Early‑return scenario
  // -----------------------------------------------------------------------
  describe('#call() – when userScores exists and firstLoginToday returns false', () => {
    it('should return the original userScores without touching the DAO', async () => {
      // Arrange
      const existingScores: UserScores = {
        approaches_score: 1,
        consistency_score: 2,
        edge_case_score: 3,
        total_score: 6,
        days_logged_in: ['2024-01-01T00:00:00.000Z', TODAY_ISO], // already logged today
      };
      firstLoginToday.mockReturnValueOnce(false); // NOT first login today

      // Act
      const result = await useCase.call(TEST_USER_ID, existingScores);

      // Assert
      expect(firstLoginToday).toHaveBeenCalledWith(existingScores.days_logged_in);
      expect(firstLoginToday).toHaveBeenCalledTimes(1);
      expect(getConsistencyScore).not.toHaveBeenCalled();
      expect(userDAO.setUserScores).not.toHaveBeenCalled();
      expect(result).toBe(existingScores);
    });
  });

  // -----------------------------------------------------------------------
  // Failure mode – DAO throws
  // -----------------------------------------------------------------------
  describe('#call() – when the DAO throws', () => {
    it('should wrap the error in an InternalServerError', async () => {
      // Arrange
      const existingScores: UserScores = {
        approaches_score: 0,
        consistency_score: 0,
        edge_case_score: 0,
        total_score: 0,
        days_logged_in: [],
      };
      firstLoginToday.mockReturnValueOnce(true);
      getConsistencyScore.mockReturnValueOnce(7);
      userDAO.setUserScores.mockRejectedValueOnce(new Error('DB failure'));

      // Act & Assert
      await expect(
        useCase.call(TEST_USER_ID, existingScores)
      ).rejects.toMatchObject(new InternalServerError('Unable to store new Scores.') as never);

      // Ensure the use‑case attempted to persist despite the failure
      expect(userDAO.setUserScores).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          consistency_score: 7,
          days_logged_in: [TODAY_ISO],
        })
      );
      expect(userDAO.setUserScores).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Failure mode – firstLoginToday throws
  // -----------------------------------------------------------------------
  describe('#call() – when firstLoginToday throws', () => {
    it('should propagate the error from firstLoginToday', async () => {
      // Arrange
      const existingScores: UserScores = {
        approaches_score: 0,
        consistency_score: 0,
        edge_case_score: 0,
        total_score: 0,
        days_logged_in: [],
      };
      const errorMsg = 'firstLoginToday blew up';
      firstLoginToday.mockImplementation(() => {
        throw new Error(errorMsg);
      });

      // Act & Assert
      await expect(useCase.call(TEST_USER_ID, existingScores)).rejects.toMatchObject(
        new InternalServerError('Unable to determine if user logged in today.') as never
      );

      // getConsistencyScore and DAO must not be reached
      expect(getConsistencyScore).not.toHaveBeenCalled();
      expect(userDAO.setUserScores).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Failure mode – getConsistencyScore throws
  // -----------------------------------------------------------------------
  describe('#call() – when getConsistencyScore throws', () => {
    it('should propagate the error from getConsistencyScore', async () => {
      // Arrange
      const existingScores: UserScores = {
        approaches_score: 0,
        consistency_score: 0,
        edge_case_score: 0,
        total_score: 0,
        days_logged_in: [],
      };
      firstLoginToday.mockReturnValueOnce(true); // we will go past the early‑return
      const errorMsg = 'getConsistencyScore failed';
      getConsistencyScore.mockImplementation(() => {
        throw new Error(errorMsg);
      });

      // Act & Assert
      // await expect(useCase.call(TEST_USER_ID, existingScores)).rejects.toThrow(
      //   Error
      // );
      await expect(useCase.call(TEST_USER_ID, existingScores)).rejects.toMatchObject(
        new InternalServerError('Unable to calculate consistency score.') as never
      );

      // DAO must not be reached because the error occurs before the try block
      expect(userDAO.setUserScores).not.toHaveBeenCalled();
    });
  });
});
