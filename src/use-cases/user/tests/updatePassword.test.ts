import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import InternalServerError from '../../../errors/internalServerError.js';
import ValidationError from '../../../errors/validationError.js';
import UpdatePassword from '../updatePassword.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
import type IValidator from '../../../interfaces/validator.js';

type HashPassword = (
  password: string,
) => Promise<{ salt: string; hashedPassword: string }>;

type UpdatePasswordPayload = {
  password: string;
  retypedPassword: string;
};

describe('UpdatePassword', () => {
  let updatePasswordDAO: jest.MockedFunction<IUserDAO['updatePassword']>;
  let hashPassword: jest.MockedFunction<HashPassword>;
  let validateUpdatePassword: jest.MockedFunction<
    IValidator<UpdatePasswordPayload>['validate']
  >;
  let userDAO: IUserDAO;
  let validator: IValidator<UpdatePasswordPayload>;
  let updatePassword: UpdatePassword;

  beforeEach(() => {
    updatePasswordDAO = jest.fn<IUserDAO['updatePassword']>();
    hashPassword = jest.fn<HashPassword>();
    validateUpdatePassword = jest.fn<IValidator<UpdatePasswordPayload>['validate']>();

    userDAO = { updatePassword: updatePasswordDAO } as unknown as IUserDAO;
    validator = {
      validate: validateUpdatePassword,
    } as unknown as IValidator<UpdatePasswordPayload>;

    updatePassword = new UpdatePassword(userDAO, hashPassword, validator);
  });

  describe('successful password update', () => {
    it('hashes the validated password and persists it', async () => {
      // Arrange
      const validatedPayload = {
        password: 'NewPassword123!',
        retypedPassword: 'NewPassword123!',
      };
      validateUpdatePassword.mockReturnValueOnce({
        success: true,
        data: validatedPayload,
      });
      hashPassword.mockResolvedValueOnce({
        salt: 'salt-123',
        hashedPassword: 'hashed-123',
      });
      updatePasswordDAO.mockResolvedValueOnce(true);

      // Act
      const result = await updatePassword.call(
        'user-123',
        '  NewPassword123!  ',
        '  NewPassword123!  ',
      );

      // Assert
      expect(validateUpdatePassword).toHaveBeenCalledTimes(1);
      expect(validateUpdatePassword).toHaveBeenCalledWith({
        password: '  NewPassword123!  ',
        retypedPassword: '  NewPassword123!  ',
      });
      expect(hashPassword).toHaveBeenCalledTimes(1);
      expect(hashPassword).toHaveBeenCalledWith(validatedPayload.password);
      expect(updatePasswordDAO).toHaveBeenCalledTimes(1);
      expect(updatePasswordDAO).toHaveBeenCalledWith('user-123', {
        salt: 'salt-123',
        password: 'hashed-123',
      });
      expect(result).toBe(true);
    });

    it.each([
      ['a normal user id', 'user-123'],
      ['an empty user id', ''],
      ['a whitespace user id', '   '],
    ])('forwards %s unchanged to the DAO', async (_label, userId) => {
      // Arrange
      validateUpdatePassword.mockReturnValueOnce({
        success: true,
        data: {
          password: 'NewPassword123!',
          retypedPassword: 'NewPassword123!',
        },
      });
      hashPassword.mockResolvedValueOnce({
        salt: 'salt-abc',
        hashedPassword: 'hashed-abc',
      });
      updatePasswordDAO.mockResolvedValueOnce(true);

      // Act
      const result = await updatePassword.call(
        userId,
        'NewPassword123!',
        'NewPassword123!',
      );

      // Assert
      expect(updatePasswordDAO).toHaveBeenCalledWith(userId, {
        salt: 'salt-abc',
        password: 'hashed-abc',
      });
      expect(result).toBe(true);
    });

    it.each([
      ['empty strings', '', ''],
      ['whitespace strings', '   ', '   '],
      ['long strings', 'A'.repeat(64), 'A'.repeat(64)],
    ])(
      'accepts %s as long as both values match and validation succeeds',
      async (_label, newPassword, retypedNewPassword) => {
        // Arrange
        validateUpdatePassword.mockReturnValueOnce({
          success: true,
          data: {
            password: newPassword.trim() || newPassword,
            retypedPassword: retypedNewPassword.trim() || retypedNewPassword,
          },
        });
        hashPassword.mockResolvedValueOnce({
          salt: 'salt-abc',
          hashedPassword: 'hashed-abc',
        });
        updatePasswordDAO.mockResolvedValueOnce(false);

        // Act
        const result = await updatePassword.call('user-123', newPassword, retypedNewPassword);

        // Assert
        expect(validateUpdatePassword).toHaveBeenCalledWith({
          password: newPassword,
          retypedPassword: retypedNewPassword,
        });
        expect(hashPassword).toHaveBeenCalledWith(
          newPassword.trim() || newPassword,
        );
        expect(updatePasswordDAO).toHaveBeenCalledWith('user-123', {
          salt: 'salt-abc',
          password: 'hashed-abc',
        });
        expect(result).toBe(false);
      },
    );
  });

  describe('password equality guard', () => {
    it.each([
      ['different passwords', 'NewPassword123!', 'OtherPassword123!'],
      ['empty vs non-empty', '', 'x'],
      ['whitespace vs trimmed text', '   ', 'password'],
      ['case difference', 'Password1!', 'password1!'],
    ])('rejects %s before validation runs', async (_label, newPassword, retypedNewPassword) => {
      // Act
      const promise = updatePassword.call('user-123', newPassword, retypedNewPassword);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: "Password and Retyped Password don't match",
        httpStatusCode: 400,
      });
      expect(validateUpdatePassword).not.toHaveBeenCalled();
      expect(hashPassword).not.toHaveBeenCalled();
      expect(updatePasswordDAO).not.toHaveBeenCalled();
    });
  });

  describe('password validation', () => {
    it('wraps a validator crash as a ValidationError', async () => {
      // Arrange
      validateUpdatePassword.mockImplementation(() => {
        throw new Error('validator crashed');
      });

      // Act
      const promise = updatePassword.call('user-123', 'NewPassword123!', 'NewPassword123!');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Password validator function failed',
        httpStatusCode: 400,
      });
      expect(hashPassword).not.toHaveBeenCalled();
      expect(updatePasswordDAO).not.toHaveBeenCalled();
    });

    it.each([
      ['validator returns false with no data', { success: false }],
      ['validator returns false with errors', {
        success: false,
        errors: [{ path: ['password'], message: 'too weak' }],
      }],
      ['validator returns null data', {
        success: true,
        data: null,
      }],
      ['validator returns undefined data', {
        success: true,
        data: undefined,
      }],
      ['validator returns errors even when success is true', {
        success: true,
        data: {
          password: 'NewPassword123!',
          retypedPassword: 'NewPassword123!',
        },
        errors: [{ path: ['password'], message: 'too weak' }],
      }],
    ])('throws ValidationError when %s', async (_label, validationResult) => {
      // Arrange
      validateUpdatePassword.mockReturnValueOnce(validationResult as ReturnType<
        typeof validateUpdatePassword
      >);

      // Act
      const promise = updatePassword.call('user-123', 'NewPassword123!', 'NewPassword123!');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Invalid Password. Try again with a new one.',
        httpStatusCode: 400,
      });
      expect(hashPassword).not.toHaveBeenCalled();
      expect(updatePasswordDAO).not.toHaveBeenCalled();
    });
  });

  describe('password hashing', () => {
    it('wraps a hashPassword error as an InternalServerError', async () => {
      // Arrange
      validateUpdatePassword.mockReturnValueOnce({
        success: true,
        data: {
          password: 'NewPassword123!',
          retypedPassword: 'NewPassword123!',
        },
      });
      hashPassword.mockRejectedValueOnce(new Error('hash failed'));

      // Act
      const promise = updatePassword.call('user-123', 'NewPassword123!', 'NewPassword123!');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Failed to hash password, please try again.',
        httpStatusCode: 500,
      });
      expect(hashPassword).toHaveBeenCalledTimes(1);
      expect(updatePasswordDAO).not.toHaveBeenCalled();
    });

    it('wraps a non-Error hashPassword rejection as an InternalServerError', async () => {
      // Arrange
      validateUpdatePassword.mockReturnValueOnce({
        success: true,
        data: {
          password: 'NewPassword123!',
          retypedPassword: 'NewPassword123!',
        },
      });
      hashPassword.mockRejectedValueOnce('hash failed');

      // Act
      const promise = updatePassword.call('user-123', 'NewPassword123!', 'NewPassword123!');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Failed to hash password, please try again.',
        httpStatusCode: 500,
      });
      expect(hashPassword).toHaveBeenCalledTimes(1);
      expect(updatePasswordDAO).not.toHaveBeenCalled();
    });
  });

  describe('database update', () => {
    it('wraps a DAO error as an InternalServerError', async () => {
      // Arrange
      validateUpdatePassword.mockReturnValueOnce({
        success: true,
        data: {
          password: 'NewPassword123!',
          retypedPassword: 'NewPassword123!',
        },
      });
      hashPassword.mockResolvedValueOnce({
        salt: 'salt-123',
        hashedPassword: 'hashed-123',
      });
      updatePasswordDAO.mockRejectedValueOnce(new Error('db failure'));

      // Act
      const promise = updatePassword.call('user-123', 'NewPassword123!', 'NewPassword123!');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Failed to update password in DB, please use old password or try again.',
        httpStatusCode: 500,
      });
      expect(updatePasswordDAO).toHaveBeenCalledTimes(1);
    });

    it('wraps a non-Error DAO rejection as an InternalServerError', async () => {
      // Arrange
      validateUpdatePassword.mockReturnValueOnce({
        success: true,
        data: {
          password: 'NewPassword123!',
          retypedPassword: 'NewPassword123!',
        },
      });
      hashPassword.mockResolvedValueOnce({
        salt: 'salt-123',
        hashedPassword: 'hashed-123',
      });
      updatePasswordDAO.mockRejectedValueOnce('db failure');

      // Act
      const promise = updatePassword.call('user-123', 'NewPassword123!', 'NewPassword123!');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Failed to update password in DB, please use old password or try again.',
        httpStatusCode: 500,
      });
      expect(updatePasswordDAO).toHaveBeenCalledTimes(1);
    });
  });
});
