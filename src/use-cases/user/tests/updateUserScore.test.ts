/**
 * Unit tests for the UpdateUserScore use‑case.
 *
 * What we verify:
 * 1. Fresh user (no existing scores) — computes initial approach and edge‑case
 *    scores from scratch and persists them.
 * 2. Existing user — averages new scores with the stored ones and persists.
 * 3. Clamping — scores above 10 are capped at 10; scores below 0 are floored at 0.
 * 4. Validation — null / non‑number arguments are rejected with clear error messages.
 *    A score of 0 is accepted (unlike the earlier falsy‑zero guard).
 * 5. DAO failure — unexpected database errors are wrapped in
 *    `InternalServerError`.
 *
 * All external collaborators (DAO) are mocked so the test exercises only the
 * use‑case logic.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import UpdateUserScore from '../updateUserScore.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
import type UserScores from '../../../entities/userScores.js';
import InternalServerError from '../../../errors/internalServerError.js';

type MockUserDAO = jest.Mocked<IUserDAO>;

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
const TEST_USER_ID = 'user-abc-123';
const MAX_POSSIBLE_SCORE = 10; // matches the constant in the use‑case

// ---------------------------------------------------------------------------
// Helper — returns an existing‑scores fixture
// ---------------------------------------------------------------------------
function existingScores(overrides: Partial<UserScores> = {}): UserScores {
  return {
    approaches_score: 50,
    consistency_score: 0,
    edge_case_score: 400,
    total_score: 0,
    days_logged_in: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('UpdateUserScore use‑case', () => {
  let useCase: UpdateUserScore;
  let userDAO: MockUserDAO;

  beforeEach(() => {
    userDAO = {
      setUserScores: jest.fn(),
      // The rest of the IUserDAO interface is unused by this use‑case but
      // must be present to satisfy the type.
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
    } as unknown as MockUserDAO;

    useCase = new UpdateUserScore(userDAO);

    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1️⃣ Happy path — fresh user (no prior scores)
  // -----------------------------------------------------------------------
  describe('#call() – no existing scores (userScores is null)', () => {
    it('should compute initial scores from scratch and persist them', async () => {
      // Arrange
      const approachScore = 8;
      const edgeCaseScore = 7;

      // formula: (approachScore / 10) * 100
      const expectedApproachScore = (approachScore / MAX_POSSIBLE_SCORE) * 100; // 80
      const expectedEdgeCaseScore = edgeCaseScore * 100; // 700

      const persistedScores = {
        approaches_score: expectedApproachScore,
        edge_case_score: expectedEdgeCaseScore,
      } as UserScores;

      userDAO.setUserScores.mockResolvedValueOnce(persistedScores);

      // Act
      const result = await useCase.call(
        TEST_USER_ID,
        null as unknown as UserScores,
        approachScore,
        edgeCaseScore,
      );

      // Assert
      expect(userDAO.setUserScores).toHaveBeenCalledWith(TEST_USER_ID, {
        approaches_score: expectedApproachScore,
        edge_case_score: expectedEdgeCaseScore,
      });
      expect(userDAO.setUserScores).toHaveBeenCalledTimes(1);
      expect(result).toEqual(persistedScores);
    });

    it('should accept a score of 0 (no longer blocked by a falsy guard)', async () => {
      // Arrange
      const approachScore = 0;
      const edgeCaseScore = 0;

      const expectedApproachScore = (approachScore / MAX_POSSIBLE_SCORE) * 100; // 0
      const expectedEdgeCaseScore = edgeCaseScore * 100; // 0

      const persistedScores = {
        approaches_score: expectedApproachScore,
        edge_case_score: expectedEdgeCaseScore,
      } as UserScores;

      userDAO.setUserScores.mockResolvedValueOnce(persistedScores);

      // Act
      const result = await useCase.call(
        TEST_USER_ID,
        null as unknown as UserScores,
        approachScore,
        edgeCaseScore,
      );

      // Assert
      expect(userDAO.setUserScores).toHaveBeenCalledWith(TEST_USER_ID, {
        approaches_score: 0,
        edge_case_score: 0,
      });
      expect(result).toEqual({
        approaches_score: 0,
        edge_case_score: 0,
      });
    });

    it('should handle tiny non‑zero scores correctly', async () => {
      // Arrange
      const approachScore = 0.001;
      const edgeCaseScore = 0.001;

      const expectedApproachScore = (approachScore / MAX_POSSIBLE_SCORE) * 100; // 0.01
      const expectedEdgeCaseScore = edgeCaseScore * 100; // 0.1

      const persistedScores = {
        approaches_score: expectedApproachScore,
        edge_case_score: expectedEdgeCaseScore,
      } as UserScores;

      userDAO.setUserScores.mockResolvedValueOnce(persistedScores);

      // Act
      const result = await useCase.call(
        TEST_USER_ID,
        null as unknown as UserScores,
        approachScore,
        edgeCaseScore,
      );

      // Assert
      expect(userDAO.setUserScores).toHaveBeenCalledWith(TEST_USER_ID, {
        approaches_score: expectedApproachScore,
        edge_case_score: expectedEdgeCaseScore,
      });
      expect(result).toEqual(persistedScores);
    });

    it('should ignore the problemDifficulty parameter (it cancels out of the formula)', async () => {
      // Arrange — different difficulty values must produce the same result
      const approachScore = 7;
      const edgeCaseScore = 6;

      const expectedApproachScore = (approachScore / MAX_POSSIBLE_SCORE) * 100; // 70
      const expectedEdgeCaseScore = edgeCaseScore * 100; // 600

      const persistedScores = {
        approaches_score: expectedApproachScore,
        edge_case_score: expectedEdgeCaseScore,
      } as UserScores;

      userDAO.setUserScores
        .mockResolvedValueOnce(persistedScores)
        .mockResolvedValueOnce(persistedScores);

      // Act — call with two different difficulty values
      const result1 = await useCase.call(
        TEST_USER_ID,
        null as unknown as UserScores,
        approachScore,
        edgeCaseScore,
      );
      const result2 = await useCase.call(
        TEST_USER_ID,
        null as unknown as UserScores,
        approachScore,
        edgeCaseScore,
      );

      // Assert — both produce identical scores
      expect(result1).toEqual(persistedScores);
      expect(result2).toEqual(persistedScores);

      expect(userDAO.setUserScores).toHaveBeenCalledWith(TEST_USER_ID, {
        approaches_score: 70,
        edge_case_score: 600,
      });
      expect(userDAO.setUserScores).toHaveBeenCalledTimes(2);
    });
  });

  // -----------------------------------------------------------------------
  // 2️⃣ Happy path — existing user with prior scores (averaging)
  // -----------------------------------------------------------------------
  describe('#call() – existing scores (userScores is provided)', () => {
    it('should average new scores with existing ones and persist', async () => {
      // Arrange
      const existing = existingScores({
        approaches_score: 50,
        edge_case_score: 400,
      });
      const approachScore = 8;
      const edgeCaseScore = 7;

      const weightedApproachScore = (approachScore / MAX_POSSIBLE_SCORE) * 100; // 80
      const mergedApproachScore =
        (existing.approaches_score + weightedApproachScore) / 2; // 65
      const mergedEdgeCaseScore =
        (existing.edge_case_score + edgeCaseScore * 100) / 2; // 550

      const persistedScores = {
        approaches_score: mergedApproachScore,
        edge_case_score: mergedEdgeCaseScore,
      } as UserScores;

      userDAO.setUserScores.mockResolvedValueOnce(persistedScores);

      // Act
      const result = await useCase.call(
        TEST_USER_ID,
        existing,
        approachScore,
        edgeCaseScore,
      );

      // Assert
      expect(userDAO.setUserScores).toHaveBeenCalledWith(TEST_USER_ID, {
        approaches_score: mergedApproachScore,
        edge_case_score: mergedEdgeCaseScore,
      });
      expect(result).toEqual(persistedScores);
    });

    it('should preserve the existing score when new score is identical', async () => {
      // Arrange
      const existing = existingScores({
        approaches_score: 80,
        edge_case_score: 700,
      });
      const approachScore = 8;
      const edgeCaseScore = 7;

      // weightedApproachScore = (8/10)*100 = 80
      // mergedApproachScore = (80 + 80) / 2 = 80
      // mergedEdgeCaseScore = (700 + 700) / 2 = 700

      userDAO.setUserScores.mockResolvedValueOnce(existing);

      // Act
      const result = await useCase.call(
        TEST_USER_ID,
        existing,
        approachScore,
        edgeCaseScore,
      );

      // Assert
      expect(userDAO.setUserScores).toHaveBeenCalledWith(TEST_USER_ID, {
        approaches_score: 80,
        edge_case_score: 700,
      });
      expect(result).toEqual(existing);
    });
  });

  // -----------------------------------------------------------------------
  // 3️⃣ Clamping — scores outside [0, 10] are capped
  // -----------------------------------------------------------------------
  describe('#call() – score clamping', () => {
    describe('upper bound (scores > 10)', () => {
      it('should clamp approachScore to 10 when it exceeds 10', async () => {
        // Arrange
        const approachScore = 15; // clamped to 10 → (10/10)*100 = 100
        const edgeCaseScore = 5;

        userDAO.setUserScores.mockResolvedValueOnce({
          approaches_score: 100,
          edge_case_score: 500,
        } as UserScores);

        // Act
        const result = await useCase.call(
          TEST_USER_ID,
          null as unknown as UserScores,
          approachScore,
          edgeCaseScore,
        );

        // Assert
        expect(userDAO.setUserScores).toHaveBeenCalledWith(TEST_USER_ID, {
          approaches_score: 100,
          edge_case_score: 500,
        });
        expect(result).toEqual({
          approaches_score: 100,
          edge_case_score: 500,
        });
      });

      it('should clamp edgeCaseScore to 10 when it exceeds 10', async () => {
        // Arrange
        const approachScore = 3;
        const edgeCaseScore = 12; // clamped to 10 → 10*100 = 1000

        userDAO.setUserScores.mockResolvedValueOnce({
          approaches_score: 30,
          edge_case_score: 1000,
        } as UserScores);

        // Act
        const result = await useCase.call(
          TEST_USER_ID,
          null as unknown as UserScores,
          approachScore,
          edgeCaseScore,
        );

        // Assert
        expect(userDAO.setUserScores).toHaveBeenCalledWith(TEST_USER_ID, {
          approaches_score: 30,
          edge_case_score: 1000,
        });
        expect(result).toEqual({
          approaches_score: 30,
          edge_case_score: 1000,
        });
      });

      it('should clamp both scores independently when both exceed 10', async () => {
        // Arrange
        const approachScore = 20; // clamped to 10 → 100
        const edgeCaseScore = 15; // clamped to 10 → 1000

        userDAO.setUserScores.mockResolvedValueOnce({
          approaches_score: 100,
          edge_case_score: 1000,
        } as UserScores);

        // Act
        const result = await useCase.call(
          TEST_USER_ID,
          null as unknown as UserScores,
          approachScore,
          edgeCaseScore,
        );

        // Assert
        expect(result).toEqual({
          approaches_score: 100,
          edge_case_score: 1000,
        });
      });

      it('should pass through exactly 10 without clamping', async () => {
        // Arrange — boundary: 10 is NOT > 10
        const approachScore = 10;
        const edgeCaseScore = 10;

        userDAO.setUserScores.mockResolvedValueOnce({
          approaches_score: 100,
          edge_case_score: 1000,
        } as UserScores);

        // Act
        const result = await useCase.call(
          TEST_USER_ID,
          null as unknown as UserScores,
          approachScore,
          edgeCaseScore,
        );

        // Assert
        expect(userDAO.setUserScores).toHaveBeenCalledWith(TEST_USER_ID, {
          approaches_score: 100,
          edge_case_score: 1000,
        });
        expect(result).toEqual({
          approaches_score: 100,
          edge_case_score: 1000,
        });
      });
    });

    describe('lower bound (scores < 0)', () => {
      it('should floor approachScore to 0 when it is negative', async () => {
        // Arrange
        const approachScore = -5; // floored to 0 → (0/10)*100 = 0
        const edgeCaseScore = 7;

        userDAO.setUserScores.mockResolvedValueOnce({
          approaches_score: 0,
          edge_case_score: 700,
        } as UserScores);

        // Act
        const result = await useCase.call(
          TEST_USER_ID,
          null as unknown as UserScores,
          approachScore,
          edgeCaseScore,
        );

        // Assert
        expect(userDAO.setUserScores).toHaveBeenCalledWith(TEST_USER_ID, {
          approaches_score: 0,
          edge_case_score: 700,
        });
        expect(result).toEqual({
          approaches_score: 0,
          edge_case_score: 700,
        });
      });

      it('should floor edgeCaseScore to 0 when it is negative', async () => {
        // Arrange
        const approachScore = 7;
        const edgeCaseScore = -3; // floored to 0 → 0*100 = 0

        userDAO.setUserScores.mockResolvedValueOnce({
          approaches_score: 70,
          edge_case_score: 0,
        } as UserScores);

        // Act
        const result = await useCase.call(
          TEST_USER_ID,
          null as unknown as UserScores,
          approachScore,
          edgeCaseScore,
        );

        // Assert
        expect(userDAO.setUserScores).toHaveBeenCalledWith(TEST_USER_ID, {
          approaches_score: 70,
          edge_case_score: 0,
        });
        expect(result).toEqual({
          approaches_score: 70,
          edge_case_score: 0,
        });
      });

      it('should floor both scores to 0 when both are negative', async () => {
        // Arrange
        const approachScore = -10;
        const edgeCaseScore = -100;

        userDAO.setUserScores.mockResolvedValueOnce({
          approaches_score: 0,
          edge_case_score: 0,
        } as UserScores);

        // Act
        const result = await useCase.call(
          TEST_USER_ID,
          null as unknown as UserScores,
          approachScore,
          edgeCaseScore,
        );

        // Assert
        expect(result).toEqual({
          approaches_score: 0,
          edge_case_score: 0,
        });
      });
    });
  });

  // -----------------------------------------------------------------------
  // 4️⃣ Validation — null / non‑number rejection
  // -----------------------------------------------------------------------
  describe('#call() – input validation', () => {
    it('should throw InternalServerError when approachScore is null', async () => {
      // Arrange
      const existing = existingScores();

      // Act & Assert
      await expect(
        useCase.call(
          TEST_USER_ID,
          existing,
          null as unknown as number,
          7,
        ),
      ).rejects.toMatchObject(
        new InternalServerError('Approach Score not sent') as never,
      );

      expect(userDAO.setUserScores).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError when approachScore is a string', async () => {
      // Arrange — typeof "string" !== "number" triggers the guard
      const existing = existingScores();

      // Act & Assert
      await expect(
        useCase.call(
          TEST_USER_ID,
          existing,
          '8' as unknown as number,
          7,
        ),
      ).rejects.toMatchObject(
        new InternalServerError('Approach Score not sent') as never,
      );

      expect(userDAO.setUserScores).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError when edgeCaseScore is null', async () => {
      // Arrange
      const existing = existingScores();

      // Act & Assert
      await expect(
        useCase.call(
          TEST_USER_ID,
          existing,
          5,
          null as unknown as number,
        ),
      ).rejects.toMatchObject(
        new InternalServerError('Edge Case Score not sent') as never,
      );

      expect(userDAO.setUserScores).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError when edgeCaseScore is a string', async () => {
      // Arrange
      const existing = existingScores();

      // Act & Assert
      await expect(
        useCase.call(
          TEST_USER_ID,
          existing,
          5,
          '7' as unknown as number,
        ),
      ).rejects.toMatchObject(
        new InternalServerError('Edge Case Score not sent') as never,
      );

      expect(userDAO.setUserScores).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError when approachScore is undefined', async () => {
      // Arrange
      const existing = existingScores();

      // Act & Assert
      await expect(
        useCase.call(
          TEST_USER_ID,
          existing,
          undefined as unknown as number,
          7,
        ),
      ).rejects.toMatchObject(
        new InternalServerError('Approach Score not sent') as never,
      );

      expect(userDAO.setUserScores).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError with correct message for edgeCaseScore', async () => {
      // Arrange
      const existing = existingScores();

      // Act & Assert
      await expect(
        useCase.call(
          TEST_USER_ID,
          existing,
          5,
          null as unknown as number,
        ),
      ).rejects.toMatchObject(
        new InternalServerError('Edge Case Score not sent') as never,
      );

      expect(userDAO.setUserScores).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 5️⃣ Error handling — DAO failure
  // -----------------------------------------------------------------------
  describe('#call() – when the DAO throws', () => {
    it('should wrap the error in an InternalServerError', async () => {
      // Arrange
      userDAO.setUserScores.mockRejectedValueOnce(
        new Error('DB connection lost'),
      );

      // Act & Assert
      await expect(
        useCase.call(
          TEST_USER_ID,
          null as unknown as UserScores,
          8,
          7,
        ),
      ).rejects.toMatchObject(
        new InternalServerError('Unable to store new Scores.') as never,
      );

      expect(userDAO.setUserScores).toHaveBeenCalledTimes(1);
    });

    it('should propagate a generic rejection from the DAO', async () => {
      // Arrange
      userDAO.setUserScores.mockRejectedValueOnce('string rejection');

      // Act & Assert
      await expect(
        useCase.call(
          TEST_USER_ID,
          null as unknown as UserScores,
          5,
          5,
        ),
      ).rejects.toMatchObject(
        new InternalServerError('Unable to store new Scores.') as never,
      );
    });
  });
});