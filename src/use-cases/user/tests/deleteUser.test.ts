/**
 * Unit tests for the DeleteUser use‑case.
 *
 * What we verify:
 * 1. Successful deletion — DAO returns true → use‑case returns true.
 * 2. No‑op deletion — DAO returns false (user already gone) → use‑case
 *    propagates false without error.
 * 3. Validation — non‑string userId values are rejected with `ValidationError`.
 * 4. DAO failure — unexpected database error → `InternalServerError`.
 *
 * All external collaborators (DAO) are mocked so the test exercises only the
 * use‑case logic.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import DeleteUser from '../deleteUser.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
import InternalServerError from '../../../errors/internalServerError.js';
import ValidationError from '../../../errors/validationError.js';

type MockUserDAO = jest.Mocked<IUserDAO>;

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('DeleteUser use‑case', () => {
  let useCase: DeleteUser;
  let userDAO: MockUserDAO;

  const TEST_USER_ID = 'user-uuid-to-delete';

  beforeEach(() => {
    userDAO = {
      delete: jest.fn(),
      // The rest of the IUserDAO interface is unused by this use‑case but
      // must be present to satisfy the type.
      create: jest.fn(),
      update: jest.fn(),
      updatePassword: jest.fn(),
      findForAuth: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      toggleBanUser: jest.fn(),
      unbanUser: jest.fn(),
      getUserScores: jest.fn(),
      setUserScores: jest.fn(),
      getUserSubmissions: jest.fn(),
      getLast5Submissions: jest.fn(),
      answer: jest.fn(),
      viewProfile: jest.fn(),
      resetPassword: jest.fn(),
      verifyEmail: jest.fn(),
      toggleEmailNotifications: jest.fn(),
    } as unknown as MockUserDAO;

    useCase = new DeleteUser(userDAO);

    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1️⃣ Happy path — DAO confirms deletion
  // -----------------------------------------------------------------------
  describe('#call() – DAO returns true', () => {
    it('should return true when the DAO successfully deletes the user', async () => {
      // Arrange
      userDAO.delete.mockResolvedValueOnce(true);

      // Act
      const result = await useCase.call(TEST_USER_ID);

      // Assert
      expect(userDAO.delete).toHaveBeenCalledWith(TEST_USER_ID);
      expect(userDAO.delete).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // 2️⃣ No‑op — DAO returns false (user already gone or not found)
  // -----------------------------------------------------------------------
  describe('#call() – DAO returns false', () => {
    it('should return false without throwing when the DAO reports no deletion', async () => {
      // Arrange — e.g. the user was already deleted or never existed
      userDAO.delete.mockResolvedValueOnce(false);

      // Act
      const result = await useCase.call(TEST_USER_ID);

      // Assert
      expect(userDAO.delete).toHaveBeenCalledWith(TEST_USER_ID);
      expect(result).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 3️⃣ Validation — userId must be a string
  // -----------------------------------------------------------------------
  describe('#call() – userId validation', () => {
    it('should throw ValidationError when userId is null', async () => {
      // Act & Assert
      await expect(
        useCase.call(null as unknown as string),
      ).rejects.toMatchObject(
        new ValidationError('userId must be a string') as never,
      );

      expect(userDAO.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when userId is undefined', async () => {
      // Act & Assert
      await expect(
        useCase.call(undefined as unknown as string),
      ).rejects.toMatchObject(
        new ValidationError('userId must be a string') as never,
      );

      expect(userDAO.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when userId is a number', async () => {
      // Act & Assert
      await expect(
        useCase.call(123 as unknown as string),
      ).rejects.toMatchObject(
        new ValidationError('userId must be a string') as never,
      );

      expect(userDAO.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when userId is an object', async () => {
      // Act & Assert
      await expect(
        useCase.call({} as unknown as string),
      ).rejects.toMatchObject(
        new ValidationError('userId must be a string') as never,
      );

      expect(userDAO.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when userId is a boolean', async () => {
      // Act & Assert
      await expect(
        useCase.call(true as unknown as string),
      ).rejects.toMatchObject(
        new ValidationError('userId must be a string') as never,
      );

      expect(userDAO.delete).not.toHaveBeenCalled();
    });

    it('should pass validation and reach the DAO when userId is an empty string', async () => {
      // Arrange — typeof "" is "string", so validation passes
      userDAO.delete.mockResolvedValueOnce(true);

      // Act
      const result = await useCase.call('');

      // Assert — the empty string is forwarded verbatim
      expect(userDAO.delete).toHaveBeenCalledWith('');
      expect(result).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // 4️⃣ Error handling — DAO throws
  // -----------------------------------------------------------------------
  describe('#call() – DAO throws', () => {
    it('should wrap a database error in InternalServerError', async () => {
      // Arrange
      userDAO.delete.mockRejectedValueOnce(
        new Error('DB connection lost during delete'),
      );

      // Act & Assert
      await expect(useCase.call(TEST_USER_ID)).rejects.toMatchObject(
        new InternalServerError(
          'Error while deleting user from DB',
        ) as never,
      );

      expect(userDAO.delete).toHaveBeenCalledWith(TEST_USER_ID);
      expect(userDAO.delete).toHaveBeenCalledTimes(1);
    });

    it('should wrap a generic rejection in InternalServerError', async () => {
      // Arrange
      userDAO.delete.mockRejectedValueOnce('raw string rejection from DAO');

      // Act & Assert
      await expect(useCase.call(TEST_USER_ID)).rejects.toMatchObject(
        new InternalServerError(
          'Error while deleting user from DB',
        ) as never,
      );
    });
  });
});