import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import User from '../../../entities/user.js';
import InternalServerError from '../../../errors/internalServerError.js';
import ValidationError from '../../../errors/validationError.js';
import UpdateUserProfile from '../updateUserSettings.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
import type IValidator from '../../../interfaces/validator.js';

type UserSettingsValues = Partial<
  Pick<User, 'email' | 'first_name' | 'last_name' | 'email_notifications_enabled'>
>;

function createUpdatedValues(overrides: UserSettingsValues = {}): UserSettingsValues {
  return {
    email: 'new@example.com',
    first_name: 'New',
    last_name: 'Name',
    email_notifications_enabled: true,
    ...overrides,
  };
}

describe('UpdateUserProfile', () => {
  let update: jest.MockedFunction<IUserDAO['update']>;
  let validateUserProfile: jest.MockedFunction<IValidator<UserSettingsValues>['validate']>;
  let userDAO: IUserDAO;
  let validator: IValidator<UserSettingsValues>;
  let updateUserProfile: UpdateUserProfile;

  beforeEach(() => {
    update = jest.fn<IUserDAO['update']>();
    validateUserProfile = jest.fn<IValidator<UserSettingsValues>['validate']>();

    userDAO = { update } as unknown as IUserDAO;
    validator = { validate: validateUserProfile } as unknown as IValidator<UserSettingsValues>;
    updateUserProfile = new UpdateUserProfile(userDAO, validator);
  });

  describe('successful update', () => {
    it('returns the updated user when validation succeeds', async () => {
      // Arrange
      const userId = 'user-123';
      const updatedValues = createUpdatedValues();
      const persistedUser = new User();
      Object.assign(persistedUser, {
        id: userId,
        email: updatedValues.email,
        first_name: updatedValues.first_name,
        last_name: updatedValues.last_name,
        email_notifications_enabled: updatedValues.email_notifications_enabled,
      });

      validateUserProfile.mockReturnValueOnce({
        success: true,
        data: updatedValues,
      });
      update.mockResolvedValueOnce(persistedUser);

      // Act
      const result = await updateUserProfile.call(userId, updatedValues);

      // Assert
      expect(validateUserProfile).toHaveBeenCalledTimes(1);
      expect(validateUserProfile).toHaveBeenCalledWith(updatedValues);
      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(userId, updatedValues);
      expect(result).toBe(persistedUser);
    });

    it.each([
      ['email only', { email: 'alpha@example.com' }],
      ['first name only', { first_name: 'Ada' }],
      ['last name only', { last_name: 'Lovelace' }],
      ['notifications only', { email_notifications_enabled: false }],
      ['all fields together', createUpdatedValues()],
      ['empty object', {}],
    ])('accepts %s as a valid partial settings payload', async (_label, updatedValues) => {
      // Arrange
      const userId = 'user-123';
      const persistedUser = new User();
      Object.assign(persistedUser, { id: userId, ...updatedValues });

      validateUserProfile.mockReturnValueOnce({
        success: true,
        data: updatedValues,
      });
      update.mockResolvedValueOnce(persistedUser);

      // Act
      const result = await updateUserProfile.call(userId, updatedValues);

      // Assert
      expect(validateUserProfile).toHaveBeenCalledWith(updatedValues);
      expect(update).toHaveBeenCalledWith(userId, updatedValues);
      expect(result).toBe(persistedUser);
    });

    it.each([
      ['a normal user id', 'user-123'],
      ['an empty user id', ''],
      ['a whitespace user id', '   '],
    ])('forwards %s unchanged to the DAO', async (_label, userId) => {
      // Arrange
      const updatedValues = createUpdatedValues({ email: 'forward@example.com' });
      const persistedUser = new User();
      Object.assign(persistedUser, { id: userId, ...updatedValues });

      validateUserProfile.mockReturnValueOnce({
        success: true,
        data: updatedValues,
      });
      update.mockResolvedValueOnce(persistedUser);

      // Act
      const result = await updateUserProfile.call(userId, updatedValues);

      // Assert
      expect(update).toHaveBeenCalledWith(userId, updatedValues);
      expect(result).toBe(persistedUser);
    });
  });

  describe('validation', () => {
    it('wraps a validator crash in an InternalServerError', async () => {
      // Arrange
      validateUserProfile.mockImplementation(() => {
        throw new Error('validator crashed');
      });

      // Act
      const promise = updateUserProfile.call('user-123', createUpdatedValues());

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'User Input Validation Function Failed',
        httpStatusCode: 500,
      });
      expect(update).not.toHaveBeenCalled();
    });

    it.each([
      ['success false without errors', { success: false }],
      ['success false with errors', {
        success: false,
        errors: [{ path: ['email'], message: 'invalid email' }],
      }],
      ['success true without data', {
        success: true,
        data: undefined,
      }],
      ['success true with null data', {
        success: true,
        data: null,
      }],
      ['success true with errors array', {
        success: true,
        data: createUpdatedValues({ email: 'ok@example.com' }),
        errors: [{ path: ['first_name'], message: 'invalid first name' }],
      }],
    ])('throws ValidationError when %s', async (_label, validationResult) => {
      // Arrange
      const updatedValues = createUpdatedValues({ email: 'valid@example.com' });
      validateUserProfile.mockReturnValueOnce(validationResult as ReturnType<
        typeof validateUserProfile
      >);

      // Act
      const promise = updateUserProfile.call('user-123', updatedValues);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Invalid user profile data',
        httpStatusCode: 400,
      });
      expect(validateUserProfile).toHaveBeenCalledWith(updatedValues);
      expect(update).not.toHaveBeenCalled();
    });

    it.each([
      ['email', { email: 'bad@example.com', role: 'admin' }],
      ['first_name', { first_name: 'Ada', banned: true }],
      ['last_name', { last_name: 'Lovelace', created_at: new Date('2026-01-01T00:00:00.000Z') }],
      ['email_notifications_enabled', { email_notifications_enabled: false, submissions: [] }],
      ['multiple user properties', { email: 'bad@example.com', role: 'admin', banned: true, email_verified: false }],
    ])('rejects updatedValues containing extra User property: %s', async (_label, extraValues) => {
      // Arrange
      const updatedValues = extraValues as unknown as UserSettingsValues;
      validateUserProfile.mockReturnValueOnce({
        success: false,
        errors: Object.keys(extraValues).map((key) => ({
          path: [key],
          message: `${key} is not allowed`,
        })),
      });

      // Act
      const promise = updateUserProfile.call('user-123', updatedValues);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Invalid user profile data',
        httpStatusCode: 400,
      });
      expect(validateUserProfile).toHaveBeenCalledWith(updatedValues);
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('dao failure', () => {
    it('wraps a DAO error in an InternalServerError', async () => {
      // Arrange
      const updatedValues = createUpdatedValues({ email: 'error@example.com' });
      validateUserProfile.mockReturnValueOnce({
        success: true,
        data: updatedValues,
      });
      update.mockRejectedValueOnce(new Error('database unavailable'));

      // Act
      const promise = updateUserProfile.call('user-123', updatedValues);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to update user profile',
        httpStatusCode: 500,
      });
      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith('user-123', updatedValues);
    });

    it('wraps a non-Error DAO rejection in an InternalServerError', async () => {
      // Arrange
      const updatedValues = createUpdatedValues({ email: 'error@example.com' });
      validateUserProfile.mockReturnValueOnce({
        success: true,
        data: updatedValues,
      });
      update.mockRejectedValueOnce('database failure');

      // Act
      const promise = updateUserProfile.call('user-123', updatedValues);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to update user profile',
        httpStatusCode: 500,
      });
      expect(update).toHaveBeenCalledTimes(1);
    });
  });
});
