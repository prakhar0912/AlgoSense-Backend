import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import AuthUser from '../../../entities/authUser.js';
import Login from '../login.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
import type IValidator from '../../../interfaces/validator.js';

type CompareWithHashedPassword = (
  password: string,
  hashedPassword: string,
) => Promise<boolean>;

type GenerateToken = (userId: string) => string;

type LoginPayload = {
  email: string;
  password: string;
};

function createAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return Object.assign(new AuthUser(), {
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
    password: 'hashed-password',
    salt: 'random-salt',
    ...overrides,
  });
}

describe('Login', () => {
  let compareWithHashedPassword: jest.MockedFunction<CompareWithHashedPassword>;
  let generateToken: jest.MockedFunction<GenerateToken>;
  let findForAuth: jest.MockedFunction<IUserDAO['findForAuth']>;
  let validateUserLogin: jest.MockedFunction<IValidator<LoginPayload>['validate']>;
  let userDAO: IUserDAO;
  let validator: IValidator<LoginPayload>;
  let login: Login;

  beforeEach(() => {
    compareWithHashedPassword = jest.fn<CompareWithHashedPassword>();
    generateToken = jest.fn<GenerateToken>();
    findForAuth = jest.fn<IUserDAO['findForAuth']>();
    validateUserLogin = jest.fn<IValidator<LoginPayload>['validate']>();
    userDAO = { findForAuth } as unknown as IUserDAO;
    validator = { validate: validateUserLogin } as unknown as IValidator<LoginPayload>;
    login = new Login(userDAO, compareWithHashedPassword, generateToken, validator);
  });

  describe('successful login', () => {
    it('returns a token and sanitized user payload when validation and credentials are valid', async () => {
      // Arrange
      const payload = {
        email: 'user@example.com',
        password: 'plain-text-password',
      };
      const user = createAuthUser();
      validateUserLogin.mockReturnValueOnce({
        success: true,
        data: payload,
      });
      findForAuth.mockResolvedValueOnce(user);
      compareWithHashedPassword.mockResolvedValueOnce(true);
      generateToken.mockReturnValueOnce('jwt-token-123');

      // Act
      const result = await login.call(payload.email, payload.password);

      // Assert
      expect(validateUserLogin).toHaveBeenCalledTimes(1);
      expect(validateUserLogin).toHaveBeenCalledWith(payload);
      expect(findForAuth).toHaveBeenCalledTimes(1);
      expect(findForAuth).toHaveBeenCalledWith(payload.email);
      expect(compareWithHashedPassword).toHaveBeenCalledTimes(1);
      expect(compareWithHashedPassword).toHaveBeenCalledWith(
        payload.password,
        user.password,
      );
      expect(generateToken).toHaveBeenCalledTimes(1);
      expect(generateToken).toHaveBeenCalledWith(user.id);
      expect(result).toEqual({
        token: 'jwt-token-123',
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
          scores: null,
          created_at: user.created_at,
          submissions: null,
          email_notifications_enabled: user.email_notifications_enabled,
          email_verified: user.email_verified,
        },
      });
    });

    it('uses the validated login payload instead of the raw input values', async () => {
      // Arrange
      const rawEmail = '  USER@EXAMPLE.COM  ';
      const rawPassword = '  plain-text-password  ';
      const validatedPayload = {
        email: 'user@example.com',
        password: 'plain-text-password',
      };
      const user = createAuthUser();
      validateUserLogin.mockReturnValueOnce({
        success: true,
        data: validatedPayload,
      });
      findForAuth.mockResolvedValueOnce(user);
      compareWithHashedPassword.mockResolvedValueOnce(true);
      generateToken.mockReturnValueOnce('jwt-token-456');

      // Act
      const result = await login.call(rawEmail, rawPassword);

      // Assert
      expect(validateUserLogin).toHaveBeenCalledWith({
        email: rawEmail,
        password: rawPassword,
      });
      expect(findForAuth).toHaveBeenCalledWith(validatedPayload.email);
      expect(compareWithHashedPassword).toHaveBeenCalledWith(
        validatedPayload.password,
        user.password,
      );
      expect(result.token).toBe('jwt-token-456');
    });
  });

  describe('validation', () => {
    it('wraps a validator crash in an InternalServerError', async () => {
      // Arrange
      validateUserLogin.mockImplementation(() => {
        throw new Error('validator crashed');
      });

      // Act
      const promise = login.call('user@example.com', 'plain-text-password');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'User Input Validation Function Failed',
        httpStatusCode: 500,
      });
      expect(findForAuth).not.toHaveBeenCalled();
      expect(compareWithHashedPassword).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    it.each([
      ['empty strings', '', ''],
      ['whitespace strings', '   ', '\t'],
      ['null values', null, null],
      ['undefined values', undefined, undefined],
      ['false values', false, false],
      ['zero values', 0, 0],
      ['NaN values', Number.NaN, Number.NaN],
      ['object values', { email: 'user@example.com' }, { password: 'secret' }],
      ['array values', ['user@example.com'], ['secret']],
    ])('forwards %s to the validator unchanged', async (_label, email, password) => {
      // Arrange
      validateUserLogin.mockReturnValueOnce({
        success: false,
        errors: [
          { path: ['email'], message: 'invalid email' },
          { path: ['password'], message: 'invalid password' },
        ],
      });

      // Act
      const promise = login.call(email as never, password as never);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Invalid user login data',
        httpStatusCode: 400,
        details: [
          { path: ['email'], message: 'invalid email' },
          { path: ['password'], message: 'invalid password' },
        ],
      });
      expect(validateUserLogin).toHaveBeenCalledTimes(1);
      expect(validateUserLogin).toHaveBeenCalledWith({ email, password } as LoginPayload);
      expect(findForAuth).not.toHaveBeenCalled();
      expect(compareWithHashedPassword).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    it.each([
      ['validator rejects the payload with errors', {
        success: false,
        errors: [
          { path: ['email'], message: 'must be a valid email' },
          { path: ['password'], message: 'must be at least 8 characters' },
        ],
      }],
      ['validator returns null data', {
        success: true,
        data: null,
      }],
      ['validator returns undefined data', {
        success: true,
        data: undefined,
      }],
      ['validator returns false without data', {
        success: false,
      }],
    ])('throws ValidationError when %s', async (_label, validationResult) => {
      // Arrange
      validateUserLogin.mockReturnValueOnce(validationResult as ReturnType<typeof validateUserLogin>);

      // Act
      const promise = login.call('user@example.com', 'plain-text-password');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Invalid user login data',
        httpStatusCode: 400,
      });
      expect(findForAuth).not.toHaveBeenCalled();
      expect(compareWithHashedPassword).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });
  });

  describe('user lookup', () => {
    it('wraps a DAO error in an InternalServerError', async () => {
      // Arrange
      validateUserLogin.mockReturnValueOnce({
        success: true,
        data: {
          email: 'user@example.com',
          password: 'plain-text-password',
        },
      });
      findForAuth.mockRejectedValueOnce(new Error('database unavailable'));

      // Act
      const promise = login.call('user@example.com', 'plain-text-password');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Internal Error in finding user from DB',
        httpStatusCode: 500,
      });
      expect(findForAuth).toHaveBeenCalledTimes(1);
      expect(compareWithHashedPassword).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('wraps a non-Error rejection from the DAO in an InternalServerError', async () => {
      // Arrange
      validateUserLogin.mockReturnValueOnce({
        success: true,
        data: {
          email: 'user@example.com',
          password: 'plain-text-password',
        },
      });
      findForAuth.mockRejectedValueOnce('database failure');

      // Act
      const promise = login.call('user@example.com', 'plain-text-password');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Internal Error in finding user from DB',
        httpStatusCode: 500,
      });
      expect(findForAuth).toHaveBeenCalledTimes(1);
      expect(compareWithHashedPassword).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
    ])('rejects when the DAO returns %s', async (_label, user) => {
      // Arrange
      validateUserLogin.mockReturnValueOnce({
        success: true,
        data: {
          email: 'user@example.com',
          password: 'plain-text-password',
        },
      });
      findForAuth.mockResolvedValueOnce(user as AuthUser | null);

      // Act
      const promise = login.call('user@example.com', 'plain-text-password');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'UnauthorizedError',
        message: 'Invalid Credentials',
        httpStatusCode: 401,
      });
      expect(findForAuth).toHaveBeenCalledTimes(1);
      expect(compareWithHashedPassword).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });
  });

  describe('password comparison', () => {
    it('throws UnauthorizedError when the password does not match', async () => {
      // Arrange
      const user = createAuthUser();
      validateUserLogin.mockReturnValueOnce({
        success: true,
        data: {
          email: user.email,
          password: 'wrong-password',
        },
      });
      findForAuth.mockResolvedValueOnce(user);
      compareWithHashedPassword.mockResolvedValueOnce(false);

      // Act
      const promise = login.call(user.email, 'wrong-password');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'UnauthorizedError',
        message: 'Invalid login or password',
        httpStatusCode: 401,
      });
      expect(compareWithHashedPassword).toHaveBeenCalledTimes(1);
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('wraps an Error thrown by the password comparer in an InternalServerError', async () => {
      // Arrange
      const user = createAuthUser();
      validateUserLogin.mockReturnValueOnce({
        success: true,
        data: {
          email: user.email,
          password: 'plain-text-password',
        },
      });
      findForAuth.mockResolvedValueOnce(user);
      compareWithHashedPassword.mockRejectedValueOnce(new Error('hash check failed'));

      // Act
      const promise = login.call(user.email, 'plain-text-password');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error in comparing passwords',
        httpStatusCode: 500,
      });
      expect(compareWithHashedPassword).toHaveBeenCalledTimes(1);
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('wraps a non-Error rejection from the password comparer in an InternalServerError', async () => {
      // Arrange
      const user = createAuthUser();
      validateUserLogin.mockReturnValueOnce({
        success: true,
        data: {
          email: user.email,
          password: 'plain-text-password',
        },
      });
      findForAuth.mockResolvedValueOnce(user);
      compareWithHashedPassword.mockRejectedValueOnce('comparison failed');

      // Act
      const promise = login.call(user.email, 'plain-text-password');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error in comparing passwords',
        httpStatusCode: 500,
      });
      expect(compareWithHashedPassword).toHaveBeenCalledTimes(1);
      expect(generateToken).not.toHaveBeenCalled();
    });
  });

  describe('token generation', () => {
    it('wraps an Error thrown by the token generator in an InternalServerError', async () => {
      // Arrange
      const user = createAuthUser();
      validateUserLogin.mockReturnValueOnce({
        success: true,
        data: {
          email: user.email,
          password: 'plain-text-password',
        },
      });
      findForAuth.mockResolvedValueOnce(user);
      compareWithHashedPassword.mockResolvedValueOnce(true);
      generateToken.mockImplementation(() => {
        throw new Error('jwt signing failed');
      });

      // Act
      const promise = login.call(user.email, 'plain-text-password');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error in extracting token, from DB userId',
        httpStatusCode: 500,
      });
      expect(generateToken).toHaveBeenCalledTimes(1);
      expect(generateToken).toHaveBeenCalledWith(user.id);
    });

    it('wraps a non-Error thrown by the token generator in an InternalServerError', async () => {
      // Arrange
      const user = createAuthUser();
      validateUserLogin.mockReturnValueOnce({
        success: true,
        data: {
          email: user.email,
          password: 'plain-text-password',
        },
      });
      findForAuth.mockResolvedValueOnce(user);
      compareWithHashedPassword.mockResolvedValueOnce(true);
      generateToken.mockImplementation(() => {
        throw 'jwt signing failed';
      });

      // Act
      const promise = login.call(user.email, 'plain-text-password');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error in extracting token, from DB userId',
        httpStatusCode: 500,
      });
      expect(generateToken).toHaveBeenCalledTimes(1);
      expect(generateToken).toHaveBeenCalledWith(user.id);
    });
  });
});
