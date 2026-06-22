import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import User from '../../../entities/user.js';
import InternalServerError from '../../../errors/internalServerError.js';
import NotFoundError from '../../../errors/notFoundError.js';
import ValidationError from '../../../errors/validationError.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
import ToggleBanUser from '../toggleBanUser.js';

function createUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: 'user-123',
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

describe('ToggleBanUser', () => {
  let findById: jest.MockedFunction<IUserDAO['findById']>;
  let toggleBanUserDAO: jest.MockedFunction<IUserDAO['toggleBanUser']>;
  let userDAO: IUserDAO;
  let toggleBanUser: ToggleBanUser;

  beforeEach(() => {
    findById = jest.fn<IUserDAO['findById']>();
    toggleBanUserDAO = jest.fn<IUserDAO['toggleBanUser']>();
    userDAO = {
      findById,
      toggleBanUser: toggleBanUserDAO,
    } as unknown as IUserDAO;
    toggleBanUser = new ToggleBanUser(userDAO);
  });

  describe('successful toggle', () => {
    it('bans a normal user when toggle is true', async () => {
      // Arrange
      const user = createUser({ banned: false, role: 'user' });
      const bannedUser = createUser({ banned: true, role: 'user' });
      findById.mockResolvedValueOnce(user);
      toggleBanUserDAO.mockResolvedValueOnce(bannedUser);

      // Act
      const result = await toggleBanUser.call('user-123', true);

      // Assert
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith('user-123');
      expect(toggleBanUserDAO).toHaveBeenCalledTimes(1);
      expect(toggleBanUserDAO).toHaveBeenCalledWith('user-123', true);
      expect(result).toBe(bannedUser);
    });

    it('unbans a normal user when toggle is false', async () => {
      // Arrange
      const user = createUser({ banned: true, role: 'user' });
      const unbannedUser = createUser({ banned: false, role: 'user' });
      findById.mockResolvedValueOnce(user);
      toggleBanUserDAO.mockResolvedValueOnce(unbannedUser);

      // Act
      const result = await toggleBanUser.call('user-123', false);

      // Assert
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith('user-123');
      expect(toggleBanUserDAO).toHaveBeenCalledTimes(1);
      expect(toggleBanUserDAO).toHaveBeenCalledWith('user-123', false);
      expect(result).toBe(unbannedUser);
    });

    it.each([
      ['a normal user id', 'user-123'],
      ['an empty user id', ''],
      ['a whitespace user id', '   '],
      ['a numeric-looking user id', '000123'],
      ['a long user id', 'user-' + 'x'.repeat(64)],
      ['a unicode user id', 'user-Δειγμα'],
    ])('forwards %s unchanged to the DAO', async (_label, userId) => {
      // Arrange
      const user = createUser({ banned: false, role: 'user' });
      const updatedUser = createUser({ banned: true, role: 'user' });
      findById.mockResolvedValueOnce(user);
      toggleBanUserDAO.mockResolvedValueOnce(updatedUser);

      // Act
      const result = await toggleBanUser.call(userId, true);

      // Assert
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(userId);
      expect(toggleBanUserDAO).toHaveBeenCalledTimes(1);
      expect(toggleBanUserDAO).toHaveBeenCalledWith(userId, true);
      expect(result).toBe(updatedUser);
    });
  });

  describe('lookup and role checks', () => {
    it('wraps an Error thrown by findById in an InternalServerError and preserves the original error', async () => {
      // Arrange
      const originalError = new Error('database unavailable');
      findById.mockRejectedValueOnce(originalError);

      // Act
      const promise = toggleBanUser.call('user-123', true);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to access users in the DB',
        httpStatusCode: 500,
        originalError,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith('user-123');
      expect(toggleBanUserDAO).not.toHaveBeenCalled();
    });

    it('wraps a non-Error rejection from findById in an InternalServerError and preserves the original value', async () => {
      // Arrange
      const originalError = 'database failure';
      findById.mockRejectedValueOnce(originalError);

      // Act
      const promise = toggleBanUser.call('user-123', false);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to access users in the DB',
        httpStatusCode: 500,
        originalError,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(toggleBanUserDAO).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when the DAO does not find a user', async () => {
      // Arrange
      findById.mockResolvedValueOnce(null);

      // Act
      const promise = toggleBanUser.call('user-123', true);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'NotFoundError',
        message: 'User not found',
        httpStatusCode: 404,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(toggleBanUserDAO).not.toHaveBeenCalled();
    });

    it('throws ValidationError when the target user is an admin', async () => {
      // Arrange
      findById.mockResolvedValueOnce(createUser({ role: 'admin' }));

      // Act
      const promise = toggleBanUser.call('user-123', true);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Cannot ban or unban an admin',
        httpStatusCode: 400,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(toggleBanUserDAO).not.toHaveBeenCalled();
    });
  });

  describe('toggle DAO failures', () => {
    it('wraps an Error thrown by toggleBanUser in an InternalServerError and preserves the original error', async () => {
      // Arrange
      findById.mockResolvedValueOnce(createUser({ role: 'user', banned: false }));
      const originalError = new Error('database write failed');
      toggleBanUserDAO.mockRejectedValueOnce(originalError);

      // Act
      const promise = toggleBanUser.call('user-123', true);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to access users in the DB',
        httpStatusCode: 500,
        originalError,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(toggleBanUserDAO).toHaveBeenCalledTimes(1);
      expect(toggleBanUserDAO).toHaveBeenCalledWith('user-123', true);
    });

    it('wraps a non-Error rejection from toggleBanUser in an InternalServerError and preserves the original value', async () => {
      // Arrange
      findById.mockResolvedValueOnce(createUser({ role: 'user', banned: true }));
      const originalError = 'database write failed';
      toggleBanUserDAO.mockRejectedValueOnce(originalError);

      // Act
      const promise = toggleBanUser.call('user-123', false);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to access users in the DB',
        httpStatusCode: 500,
        originalError,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(toggleBanUserDAO).toHaveBeenCalledTimes(1);
      expect(toggleBanUserDAO).toHaveBeenCalledWith('user-123', false);
    });
  });
});
