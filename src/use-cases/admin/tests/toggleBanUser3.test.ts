import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { User } from '../../../entities/index.js';
import type { IUserDAO } from '../../../interfaces/index.js';
import ToggleBanUser from '../toggleBanUser.js';

function createUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: 'user-123',
    email: 'user@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'user' as const,
    banned: false,
    created_at: '2026-01-01T00:00:00.000Z',
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

  describe('successful toggles', () => {
    it.each([
      ['bans a user when toggle is true', true, false, true],
      ['unbans a user when toggle is false', false, true, false],
    ])('%s', async (_label, toggle, initialBanned, finalBanned) => {
      // Arrange
      const foundUser = createUser({ banned: initialBanned });
      const updatedUser = createUser({ banned: finalBanned });
      findById.mockResolvedValueOnce(foundUser);
      toggleBanUserDAO.mockResolvedValueOnce(updatedUser);

      // Act
      const result = await toggleBanUser.call('user-123', toggle);

      // Assert
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith('user-123');
      expect(toggleBanUserDAO).toHaveBeenCalledTimes(1);
      expect(toggleBanUserDAO).toHaveBeenCalledWith('user-123', toggle);
      expect(findById.mock.invocationCallOrder[0]).toBeLessThan(
        toggleBanUserDAO.mock.invocationCallOrder[0],
      );
      expect(result).toBe(updatedUser);
    });

    it.each([
      ['a normal user id', 'user-123'],
      ['an empty user id', ''],
      ['a whitespace user id', '   '],
      ['a numeric-looking user id', '000123'],
      ['a long user id', `user-${'x'.repeat(64)}`],
      ['a unicode user id', 'user-Δειγμα'],
    ])('forwards %s unchanged to the DAO', async (_label, userId) => {
      // Arrange
      const foundUser = createUser({ banned: false });
      const updatedUser = createUser({ banned: true });
      findById.mockResolvedValueOnce(foundUser);
      toggleBanUserDAO.mockResolvedValueOnce(updatedUser);

      // Act
      const result = await toggleBanUser.call(userId, true);

      // Assert
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(userId);
      expect(toggleBanUserDAO).toHaveBeenCalledTimes(1);
      expect(toggleBanUserDAO).toHaveBeenCalledWith(userId, true);
      expect(findById.mock.invocationCallOrder[0]).toBeLessThan(
        toggleBanUserDAO.mock.invocationCallOrder[0],
      );
      expect(result).toBe(updatedUser);
    });
  });

  describe('lookup failures', () => {
    it.each([
      ['an Error', new Error('database unavailable')],
      ['a string', 'database unavailable'],
    ])('wraps %s thrown by findById in an InternalServerError', async (_label, originalError) => {
      // Arrange
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

    it('throws NotFoundError when findById returns null', async () => {
      // Arrange
      findById.mockResolvedValueOnce(null);

      // Act
      const promise = toggleBanUser.call('user-123', false);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'NotFoundError',
        message: 'User not found',
        httpStatusCode: 404,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith('user-123');
      expect(toggleBanUserDAO).not.toHaveBeenCalled();
    });

    it('throws ValidationError when the user is an admin', async () => {
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
      expect(findById).toHaveBeenCalledWith('user-123');
      expect(toggleBanUserDAO).not.toHaveBeenCalled();
    });
  });

  describe('toggle failures', () => {
    it.each([
      ['an Error', new Error('database write failed')],
      ['a string', 'database write failed'],
    ])('wraps %s thrown by toggleBanUser in an InternalServerError', async (_label, originalError) => {
      // Arrange
      const foundUser = createUser({ banned: false });
      findById.mockResolvedValueOnce(foundUser);
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
      expect(findById).toHaveBeenCalledWith('user-123');
      expect(toggleBanUserDAO).toHaveBeenCalledTimes(1);
      expect(toggleBanUserDAO).toHaveBeenCalledWith('user-123', true);
      expect(findById.mock.invocationCallOrder[0]).toBeLessThan(
        toggleBanUserDAO.mock.invocationCallOrder[0],
      );
    });
  });
});
