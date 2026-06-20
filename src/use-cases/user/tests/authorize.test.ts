import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import User from '../../../entities/user.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
import AuthorizeUser from '../authorize.js';

type ExtractTokenValue = (token: string) => string | null;

const TOKEN = 'valid-jwt-token';
const USER_ID = 'user-123';

function createUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: USER_ID,
    email: 'user@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'user' as const,
    banned: false,
    scores: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    submissions: null,
    email_verified: true,
    email_notifications_enabled: true,
    ...overrides,
  });
}

describe('AuthorizeUser', () => {
  let extractTokenValue: jest.MockedFunction<ExtractTokenValue>;
  let findById: jest.MockedFunction<IUserDAO['findById']>;
  let userDAO: IUserDAO;
  let authorizeUser: AuthorizeUser;

  beforeEach(() => {
    extractTokenValue = jest.fn<ExtractTokenValue>();
    findById = jest.fn<IUserDAO['findById']>();
    userDAO = { findById } as unknown as IUserDAO;
    authorizeUser = new AuthorizeUser(extractTokenValue, userDAO);
  });

  describe('successful authorization', () => {
    it('returns the exact user returned by the DAO', async () => {
      // Arrange
      const user = createUser();
      extractTokenValue.mockReturnValue(USER_ID);
      findById.mockResolvedValue(user);

      // Act
      const result = await authorizeUser.call(TOKEN);

      // Assert
      expect(result).toBe(user);
      expect(extractTokenValue).toHaveBeenCalledTimes(1);
      expect(extractTokenValue).toHaveBeenCalledWith(TOKEN);
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(USER_ID);
      expect(extractTokenValue.mock.invocationCallOrder[0]).toBeLessThan(
        findById.mock.invocationCallOrder[0]!,
      );
    });

    it.each([
      ['admin user', { role: 'admin' as const }],
      ['banned user', { banned: true }],
      ['unverified user', { email_verified: false }],
    ])('returns an existing %s because this use case only checks existence', async (_label, overrides) => {
      // Arrange
      const user = createUser(overrides);
      extractTokenValue.mockReturnValue(USER_ID);
      findById.mockResolvedValue(user);

      // Act
      const result = await authorizeUser.call(TOKEN);

      // Assert
      expect(result).toBe(user);
      expect(findById).toHaveBeenCalledWith(USER_ID);
    });
  });

  describe('token input validation', () => {
    it.each([
      ['an empty string', ''],
      ['null', null],
      ['undefined', undefined],
      ['a number', 123],
      ['a boolean', false],
      ['an object', {}],
    ])('rejects %s before calling any dependency', async (_label, token) => {
      // Act
      const promise = authorizeUser.call(token as string);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'UnauthorizedError',
        message: 'Please provide a token to authenticate',
        httpStatusCode: 401,
      });
      expect(extractTokenValue).not.toHaveBeenCalled();
      expect(findById).not.toHaveBeenCalled();
    });

    it('passes a whitespace-only token to the token extractor', async () => {
      // Arrange
      extractTokenValue.mockReturnValue(null);

      // Act
      const promise = authorizeUser.call('   ');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'UnauthorizedError',
        message: 'Invalid or Expired Token',
        httpStatusCode: 401,
      });
      expect(extractTokenValue).toHaveBeenCalledTimes(1);
      expect(extractTokenValue).toHaveBeenCalledWith('   ');
      expect(findById).not.toHaveBeenCalled();
    });
  });

  describe('token extraction', () => {
    it('wraps an Error thrown by the token extractor', async () => {
      // Arrange
      extractTokenValue.mockImplementation(() => {
        throw new Error('JWT verification failed');
      });

      // Act
      const promise = authorizeUser.call(TOKEN);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error while extracting Token value',
        httpStatusCode: 500,
      });
      expect(extractTokenValue).toHaveBeenCalledTimes(1);
      expect(extractTokenValue).toHaveBeenCalledWith(TOKEN);
      expect(findById).not.toHaveBeenCalled();
    });

    it('wraps a non-Error value thrown by the token extractor', async () => {
      // Arrange
      extractTokenValue.mockImplementation(() => {
        throw 'token extraction failure';
      });

      // Act
      const promise = authorizeUser.call(TOKEN);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error while extracting Token value',
        httpStatusCode: 500,
      });
      expect(findById).not.toHaveBeenCalled();
    });

    it.each([
      ['null', null],
      ['an empty user ID', ''],
      ['undefined', undefined],
    ])('rejects when the token extractor returns %s', async (_label, extractedId) => {
      // Arrange
      extractTokenValue.mockReturnValue(extractedId as string | null);

      // Act
      const promise = authorizeUser.call(TOKEN);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'UnauthorizedError',
        message: 'Invalid or Expired Token',
        httpStatusCode: 401,
      });
      expect(extractTokenValue).toHaveBeenCalledTimes(1);
      expect(extractTokenValue).toHaveBeenCalledWith(TOKEN);
      expect(findById).not.toHaveBeenCalled();
    });
  });

  describe('user lookup', () => {
    it('wraps an Error rejected by the DAO', async () => {
      // Arrange
      extractTokenValue.mockReturnValue(USER_ID);
      findById.mockRejectedValue(new Error('database unavailable'));

      // Act
      const promise = authorizeUser.call(TOKEN);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error while fetching user from DB',
        httpStatusCode: 500,
      });
      expect(extractTokenValue).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(USER_ID);
    });

    it('wraps a non-Error rejection from the DAO', async () => {
      // Arrange
      extractTokenValue.mockReturnValue(USER_ID);
      findById.mockRejectedValue('database failure');

      // Act
      const promise = authorizeUser.call(TOKEN);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error while fetching user from DB',
        httpStatusCode: 500,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(USER_ID);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
    ])('rejects when the DAO returns %s', async (_label, user) => {
      // Arrange
      extractTokenValue.mockReturnValue(USER_ID);
      findById.mockResolvedValue(user as User | null);

      // Act
      const promise = authorizeUser.call(TOKEN);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'UnauthorizedError',
        message: "User dosen't exist",
        httpStatusCode: 401,
      });
      expect(extractTokenValue).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(USER_ID);
    });
  });
});
