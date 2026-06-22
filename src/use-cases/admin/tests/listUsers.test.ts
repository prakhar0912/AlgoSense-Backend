import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import User from '../../../entities/user.js';
import InternalServerError from '../../../errors/internalServerError.js';
import { ValidationError } from '../../../errors/index.js';
import type IPaginated from '../../../interfaces/paginated.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
import ListUsers from '../listUsers.js';

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

function createPaginatedUsers(
  data: User[],
  page: number,
  perPage: number,
): IPaginated<User> {
  return {
    data,
    pagination: {
      page,
      perPage,
    },
  };
}

describe('ListUsers', () => {
  let findAll: jest.MockedFunction<IUserDAO['findAll']>;
  let userDAO: IUserDAO;
  let listUsers: ListUsers;

  beforeEach(() => {
    findAll = jest.fn<IUserDAO['findAll']>();
    userDAO = { findAll } as unknown as IUserDAO;
    listUsers = new ListUsers(userDAO);
  });

  describe('successful listing', () => {
    it('returns the exact paginated result from the DAO when called with defaults', async () => {
      // Arrange
      const expected = createPaginatedUsers([createUser()], 1, 10);
      findAll.mockResolvedValueOnce(expected);

      // Act
      const result = await listUsers.call({});

      // Assert
      expect(findAll).toHaveBeenCalledTimes(1);
      expect(findAll).toHaveBeenCalledWith({}, 1, 10);
      expect(result).toBe(expected);
      expect(result.pagination).toEqual({ page: 1, perPage: 10 });
    });

    it.each([
      ['email filter', { email: 'admin@example.com' }],
      ['first name filter', { first_name: 'Ada' }],
      ['last name filter', { last_name: 'Lovelace' }],
      ['role filter', { role: 'admin' as const }],
      ['banned filter', { banned: true }],
      ['email verified filter', { email_verified: false }],
      ['notifications filter', { email_notifications_enabled: false }],
      ['created_at filter', { created_at: new Date('2026-01-01T00:00:00.000Z') }],
      ['submissions filter', { submissions: [] }],
      ['scores filter', { scores: null }],
    ])('forwards %s unchanged to the DAO', async (_label, filters) => {
      // Arrange
      const expected = createPaginatedUsers([createUser()], 2, 25);
      findAll.mockResolvedValueOnce(expected);

      // Act
      const result = await listUsers.call(filters as Partial<User>);

      // Assert
      expect(findAll).toHaveBeenCalledTimes(1);
      expect(findAll).toHaveBeenCalledWith(filters, 1, 10);
      expect(result).toBe(expected);
    });

    it('forwards a multi-field filter object unchanged to the DAO', async () => {
      // Arrange
      const filters: Partial<User> = {
        email: 'admin@example.com',
        role: 'admin',
        banned: false,
        email_verified: true,
        email_notifications_enabled: true,
      };
      const expected = createPaginatedUsers([createUser({ role: 'admin' })], 3, 15);
      findAll.mockResolvedValueOnce(expected);

      // Act
      const result = await listUsers.call(filters, 3, 15);

      // Assert
      expect(findAll).toHaveBeenCalledTimes(1);
      expect(findAll).toHaveBeenCalledWith(filters, 3, 15);
      expect(result).toBe(expected);
    });

    it.each([
      ['page=1 perPage=1', 1, 1],
      ['page=1 perPage=50', 1, 50],
      ['page=99 perPage=1', 99, 1],
      ['page=7 perPage=25', 7, 25],
    ])('accepts %s', async (_label, page, perPage) => {
      // Arrange
      const expected = createPaginatedUsers([], page, perPage);
      findAll.mockResolvedValueOnce(expected);

      // Act
      const result = await listUsers.call({}, page, perPage);

      // Assert
      expect(findAll).toHaveBeenCalledTimes(1);
      expect(findAll).toHaveBeenCalledWith({}, page, perPage);
      expect(result).toBe(expected);
    });
  });

  describe('pagination validation', () => {
    it.each([
      ['page is 0', 0, 10],
      ['page is negative', -1, 10],
      ['page is decimal', 1.5, 10],
      ['page is NaN', Number.NaN, 10],
      ['page is Infinity', Number.POSITIVE_INFINITY, 10],
      ['page is -Infinity', Number.NEGATIVE_INFINITY, 10],
      ['perPage is 0', 1, 0],
      ['perPage is negative', 1, -10],
      ['perPage is decimal', 1, 2.5],
      ['perPage is NaN', 1, Number.NaN],
      ['perPage is Infinity', 1, Number.POSITIVE_INFINITY],
      ['perPage is -Infinity', 1, Number.NEGATIVE_INFINITY],
      ['both are invalid', 0, 0],
      ['both are decimals', 1.1, 2.2],
    ])('rejects when %s', async (_label, page, perPage) => {
      // Act
      const promise = listUsers.call({}, page, perPage);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Page and perPage must be positive whole integers',
        httpStatusCode: 400,
      });
      expect(findAll).not.toHaveBeenCalled();
    });
  });

  describe('dao failure', () => {
    it('wraps an Error thrown by the DAO in an InternalServerError and preserves the original error', async () => {
      // Arrange
      const originalError = new Error('database unavailable');
      findAll.mockRejectedValueOnce(originalError);

      // Act
      const promise = listUsers.call({ email: 'admin@example.com' }, 2, 20);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to access users in the DB',
        httpStatusCode: 500,
        originalError,
      });
      expect(findAll).toHaveBeenCalledTimes(1);
      expect(findAll).toHaveBeenCalledWith({ email: 'admin@example.com' }, 2, 20);
    });

    it('wraps a non-Error rejection from the DAO in an InternalServerError and preserves the original value', async () => {
      // Arrange
      const originalError = 'database failure';
      findAll.mockRejectedValueOnce(originalError);

      // Act
      const promise = listUsers.call({ banned: true }, 4, 30);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to access users in the DB',
        httpStatusCode: 500,
        originalError,
      });
      expect(findAll).toHaveBeenCalledTimes(1);
      expect(findAll).toHaveBeenCalledWith({ banned: true }, 4, 30);
    });
  });
});
