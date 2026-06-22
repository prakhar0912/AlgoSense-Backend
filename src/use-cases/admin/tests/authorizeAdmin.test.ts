import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import User from '../../../entities/user.js';
import InternalServerError from '../../../errors/internalServerError.js';
import UnauthorizedError from '../../../errors/unauthorizedError.js';
import AuthorizeAdmin from '../authorizeAdmin.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';

type VerifyToken = (token: string) => string | null;

const TOKEN = 'valid-admin-token';
const USER_ID = 'user-123';

function createUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: USER_ID,
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin' as const,
    banned: false,
    scores: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    submissions: null,
    email_verified: true,
    email_notifications_enabled: true,
    ...overrides,
  });
}

describe('AuthorizeAdmin', () => {
  let verifyToken: jest.MockedFunction<VerifyToken>;
  let findById: jest.MockedFunction<IUserDAO['findById']>;
  let userDAO: IUserDAO;
  let authorizeAdmin: AuthorizeAdmin;

  beforeEach(() => {
    verifyToken = jest.fn<VerifyToken>();
    findById = jest.fn<IUserDAO['findById']>();
    userDAO = { findById } as unknown as IUserDAO;
    authorizeAdmin = new AuthorizeAdmin(userDAO, verifyToken);
  });

  describe('successful authorization', () => {
    it('returns the exact admin user returned by the DAO', async () => {
      // Arrange
      const user = createUser({ role: 'admin' });
      verifyToken.mockReturnValueOnce(USER_ID);
      findById.mockResolvedValueOnce(user);

      // Act
      const result = await authorizeAdmin.call(TOKEN);

      // Assert
      expect(result).toBe(user);
      expect(verifyToken).toHaveBeenCalledTimes(1);
      expect(verifyToken).toHaveBeenCalledWith(TOKEN);
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(USER_ID);
      expect(verifyToken.mock.invocationCallOrder[0]).toBeLessThan(
        findById.mock.invocationCallOrder[0]!,
      );
    });

    it.each([
      ['empty string token', ''],
      ['whitespace token', '   '],
    ])('forwards %s to the verifier unchanged', async (_label, token) => {
      // Arrange
      const user = createUser({ role: 'admin' });
      verifyToken.mockReturnValueOnce(USER_ID);
      findById.mockResolvedValueOnce(user);

      // Act
      const result = await authorizeAdmin.call(token);

      // Assert
      expect(verifyToken).toHaveBeenCalledTimes(1);
      expect(verifyToken).toHaveBeenCalledWith(token);
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(USER_ID);
      expect(result).toBe(user);
    });
  });

  describe('token verification', () => {
    it('wraps an Error thrown by the verifier in an InternalServerError', async () => {
      // Arrange
      verifyToken.mockImplementation(() => {
        throw new Error('jwt verification failed');
      });

      // Act
      const promise = authorizeAdmin.call(TOKEN);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Token Verification Failed',
        httpStatusCode: 500,
        originalError: new Error('jwt verification failed')
      });
      expect(verifyToken).toHaveBeenCalledTimes(1);
      expect(verifyToken).toHaveBeenCalledWith(TOKEN);
      expect(findById).not.toHaveBeenCalled();
    });

    it('wraps a non-Error value thrown by the verifier in an InternalServerError', async () => {
      // Arrange
      verifyToken.mockImplementation(() => {
        throw 'jwt verification failed';
      });

      // Act
      const promise = authorizeAdmin.call(TOKEN);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Token Verification Failed',
        httpStatusCode: 500,
        originalError: 'jwt verification failed'
      });
      expect(findById).not.toHaveBeenCalled();
    });

    it.each([
      ['null', null],
      ['empty string', ''],
    ])('rejects when the verifier returns %s', async (_label, verifiedId) => {
      // Arrange
      verifyToken.mockReturnValueOnce(verifiedId as string | null);

      // Act
      const promise = authorizeAdmin.call(TOKEN);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'UnauthorizedError',
        message: 'Invalid or Expired Token',
        httpStatusCode: 401,
      });
      expect(verifyToken).toHaveBeenCalledTimes(1);
      expect(verifyToken).toHaveBeenCalledWith(TOKEN);
      expect(findById).not.toHaveBeenCalled();
    });
  });

  describe('user lookup', () => {
    it('wraps an Error thrown by the DAO in an InternalServerError', async () => {
      // Arrange
      verifyToken.mockReturnValueOnce(USER_ID);
      findById.mockRejectedValueOnce(new Error('database unavailable'));

      // Act
      const promise = authorizeAdmin.call(TOKEN);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to access DB for user',
        httpStatusCode: 500,
        originalError: new Error('database unavailable')
      });
      expect(verifyToken).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(USER_ID);
    });

    it('wraps a non-Error rejection from the DAO in an InternalServerError', async () => {
      // Arrange
      verifyToken.mockReturnValueOnce(USER_ID);
      findById.mockRejectedValueOnce('database failure');

      // Act
      const promise = authorizeAdmin.call(TOKEN);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to access DB for user',
        httpStatusCode: 500,
        originalError: 'database failure'
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(USER_ID);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
    ])('rejects when the DAO returns %s', async (_label, user) => {
      // Arrange
      verifyToken.mockReturnValueOnce(USER_ID);
      findById.mockResolvedValueOnce(user as User | null);

      // Act
      const promise = authorizeAdmin.call(TOKEN);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'UnauthorizedError',
        message: "User doesn't exist",
        httpStatusCode: 401,
      });
      expect(verifyToken).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(USER_ID);
    });
  });

  describe('role checks', () => {
    it.each([
      ['user role', { role: 'user' as const }],
      ['banned admin', { role: 'admin' as const, banned: true }],
    ])('rejects %s when the user is not an admin account', async (_label, overrides) => {
      // Arrange
      const user = createUser(overrides);
      verifyToken.mockReturnValueOnce(USER_ID);
      findById.mockResolvedValueOnce(user);

      // Act
      const promise = authorizeAdmin.call(TOKEN);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'UnauthorizedError',
        message: "User isn't an admin",
        httpStatusCode: 401,
      });
      expect(verifyToken).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(USER_ID);
    });

    it('returns the user when the role is admin', async () => {
      // Arrange
      const user = createUser({ role: 'admin' });
      verifyToken.mockReturnValueOnce(USER_ID);
      findById.mockResolvedValueOnce(user);

      // Act
      const result = await authorizeAdmin.call(TOKEN);

      // Assert
      expect(result).toBe(user);
      expect(findById).toHaveBeenCalledWith(USER_ID);
    });
  });
});
