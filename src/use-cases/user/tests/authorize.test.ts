/**
 * Unit tests for the AuthorizeUser use‑case.
 *
 * What we verify:
 * 1. Valid token + existing user → returns the user entity.
 * 2. Missing/falsy token → UnauthorizedError.
 * 3. Token extraction throws unexpectedly → InternalServerError.
 * 4. Token extraction returns null → UnauthorizedError (invalid/expired).
 * 5. DAO lookup throws → InternalServerError.
 * 6. DAO returns null → UnauthorizedError (user doesn't exist).
 *
 * All external collaborators (DAO, token extractor) are mocked so the test
 * exercises only the use‑case logic.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import AuthorizeUser from '../authorize.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
import User from '../../../entities/user.js';
import UnauthorizedError from '../../../errors/unauthorizedError.js';
import InternalServerError from '../../../errors/internalServerError.js';

type MockUserDAO = jest.Mocked<IUserDAO>;
type IExtractTokenValue = (token: string) => string | null;

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const VALID_TOKEN = 'bearer-jwt-token-123';
const VALID_USER_ID = 'user-uuid-abc';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: VALID_USER_ID,
    email: 'alice@example.com',
    first_name: 'Alice',
    last_name: 'Smith',
    role: 'user',
    banned: false,
    scores: null,
    created_at: new Date(),
    submissions: null,
    email_verified: true,
    email_notifications_enabled: true,
    ...overrides,
  } as User;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('AuthorizeUser use‑case', () => {
  let useCase: AuthorizeUser;
  let userDAO: MockUserDAO;
  let extractTokenValue: jest.Mock<IExtractTokenValue>;

  beforeEach(() => {
    // ---------- DAO mock ----------
    userDAO = {
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
      setUserScores: jest.fn(),
      getUserSubmissions: jest.fn(),
      getLast5Submissions: jest.fn(),
      answer: jest.fn(),
      viewProfile: jest.fn(),
      resetPassword: jest.fn(),
      verifyEmail: jest.fn(),
      toggleEmailNotifications: jest.fn(),
    } as unknown as MockUserDAO;

    extractTokenValue = jest.fn();

    useCase = new AuthorizeUser(extractTokenValue, userDAO);

    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1️⃣ Happy path — valid token → ID → existing user
  // -----------------------------------------------------------------------
  describe('#call() – successful authorization', () => {
    it('should return the user when the token is valid and the user exists', async () => {
      // Arrange
      const user = buildUser();
      extractTokenValue.mockReturnValueOnce(VALID_USER_ID);
      userDAO.findById.mockResolvedValueOnce(user);

      // Act
      const result = await useCase.call(VALID_TOKEN);

      // Assert
      expect(extractTokenValue).toHaveBeenCalledWith(VALID_TOKEN);
      expect(userDAO.findById).toHaveBeenCalledWith(VALID_USER_ID);
      expect(result).toBe(user);
    });

    it('should return the correct user for an admin role', async () => {
      // Arrange
      const adminUser = buildUser({ role: 'admin' });
      extractTokenValue.mockReturnValueOnce(VALID_USER_ID);
      userDAO.findById.mockResolvedValueOnce(adminUser);

      // Act
      const result = await useCase.call(VALID_TOKEN);

      // Assert
      expect(result.role).toBe('admin');
      expect(result).toBe(adminUser);
    });

    it('should work even if user is banned (authorization is not ban-checking)', async () => {
      // Arrange — AuthorizeUser only checks existence, not ban status
      const bannedUser = buildUser({ banned: true });
      extractTokenValue.mockReturnValueOnce(VALID_USER_ID);
      userDAO.findById.mockResolvedValueOnce(bannedUser);

      // Act
      const result = await useCase.call(VALID_TOKEN);

      // Assert
      expect(result.banned).toBe(true);
      expect(result).toBe(bannedUser);
    });
  });

  // -----------------------------------------------------------------------
  // 2️⃣ Missing / falsy token
  // -----------------------------------------------------------------------
  describe('#call() – missing token', () => {
    it('should throw UnauthorizedError when token is empty string', async () => {
      // Act & Assert
      await expect(useCase.call('')).rejects.toMatchObject(
        new UnauthorizedError(
          'Please provide a token to authenticate',
        ) as never,
      );

      expect(extractTokenValue).not.toHaveBeenCalled();
      expect(userDAO.findById).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when token is null', async () => {
      // Act & Assert
      await expect(
        useCase.call(null as unknown as string),
      ).rejects.toMatchObject(
        new UnauthorizedError(
          'Please provide a token to authenticate',
        ) as never,
      );

      expect(extractTokenValue).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when token is undefined', async () => {
      // Act & Assert
      await expect(
        useCase.call(undefined as unknown as string),
      ).rejects.toMatchObject(
        new UnauthorizedError(
          'Please provide a token to authenticate',
        ) as never,
      );

      expect(extractTokenValue).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when token is only whitespace (truthy string)', async () => {
      // Arrange — " " is truthy, so it passes the !token guard
      // and reaches extractTokenValue instead
      extractTokenValue.mockReturnValueOnce(null);

      // Act & Assert
      await expect(useCase.call(' ')).rejects.toMatchObject(
        new UnauthorizedError('Invalid or Expired Token') as never,
      );

      // extractTokenValue was called because " " is truthy
      expect(extractTokenValue).toHaveBeenCalledWith(' ');
    });
  });

  // -----------------------------------------------------------------------
  // 3️⃣ Token extraction throws
  // -----------------------------------------------------------------------
  describe('#call() – extractTokenValue throws', () => {
    it('should wrap the crash in InternalServerError', async () => {
      // Arrange
      extractTokenValue.mockImplementation(() => {
        throw new Error('JWT library crashed');
      });

      // Act & Assert
      await expect(useCase.call(VALID_TOKEN)).rejects.toMatchObject(
        new InternalServerError(
          'Error while extracting Token value',
        ) as never,
      );

      // DAO should not have been reached
      expect(userDAO.findById).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 4️⃣ Token extraction returns null (invalid / expired token)
  // -----------------------------------------------------------------------
  describe('#call() – extractTokenValue returns null', () => {
    it('should throw UnauthorizedError when token cannot be decoded', async () => {
      // Arrange
      extractTokenValue.mockReturnValueOnce(null);

      // Act & Assert
      await expect(useCase.call(VALID_TOKEN)).rejects.toMatchObject(
        new UnauthorizedError('Invalid or Expired Token') as never,
      );

      // DAO should not have been reached
      expect(userDAO.findById).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 5️⃣ DAO.findById throws
  // -----------------------------------------------------------------------
  describe('#call() – DAO.findById throws', () => {
    it('should wrap a database failure in InternalServerError', async () => {
      // Arrange
      extractTokenValue.mockReturnValueOnce(VALID_USER_ID);
      userDAO.findById.mockRejectedValueOnce(new Error('DB connection lost'));

      // Act & Assert
      await expect(useCase.call(VALID_TOKEN)).rejects.toMatchObject(
        new InternalServerError(
          'Error while fetching user from DB',
        ) as never,
      );

      expect(extractTokenValue).toHaveBeenCalledWith(VALID_TOKEN);
      expect(userDAO.findById).toHaveBeenCalledWith(VALID_USER_ID);
    });

    it('should wrap a non-Error rejection in InternalServerError', async () => {
      // Arrange
      extractTokenValue.mockReturnValueOnce(VALID_USER_ID);
      userDAO.findById.mockRejectedValueOnce('string rejection');

      // Act & Assert
      await expect(useCase.call(VALID_TOKEN)).rejects.toMatchObject(
        new InternalServerError(
          'Error while fetching user from DB',
        ) as never,
      );
    });
  });

  // -----------------------------------------------------------------------
  // 6️⃣ DAO.findById returns null (user doesn't exist)
  // -----------------------------------------------------------------------
  describe('#call() – user not found in DB', () => {
    it('should throw UnauthorizedError when no user matches the token ID', async () => {
      // Arrange
      extractTokenValue.mockReturnValueOnce(VALID_USER_ID);
      userDAO.findById.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(useCase.call(VALID_TOKEN)).rejects.toMatchObject(
        new UnauthorizedError('User dosen\'t exist') as never,
      );

      expect(extractTokenValue).toHaveBeenCalledWith(VALID_TOKEN);
      expect(userDAO.findById).toHaveBeenCalledWith(VALID_USER_ID);
    });
  });
});