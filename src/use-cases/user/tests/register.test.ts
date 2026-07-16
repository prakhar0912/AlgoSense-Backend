import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import RegisterUser from '../register.js';
import User from '../../../entities/user.js';
import InternalServerError from '../../../errors/internalServerError.js';
import { ValidationError } from '../../../errors/index.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
import type IValidator from '../../../interfaces/validator.js';

const VALID_PAYLOAD = {
  id: 'user-abc-123',
  email: 'newuser@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  created_at: '2026-07-09T10:30:00.000Z',
  email_verified: false,
  email_notifications_enabled: false,
};


type UserCreationPayload = {
  id: string
  email: string,
  first_name?: string,
  last_name?: string,
  created_at: string,
  email_verified: boolean,
  email_notifications_enabled?: boolean
}
type MockUserDAO = jest.Mocked<IUserDAO>;
type MockValidator = jest.Mocked<IValidator<UserCreationPayload>>;

function buildPersistedUser(overrides: Partial<User> = {}) {
  const persistedUser = new User();
  Object.assign(persistedUser, {
    id: VALID_PAYLOAD.id,
    email: VALID_PAYLOAD.email,
    first_name: VALID_PAYLOAD.first_name,
    last_name: VALID_PAYLOAD.last_name,
    role: 'user' as const,
    banned: false,
    scores: null,
    created_at: VALID_PAYLOAD.created_at,
    last_5_submissions: null,
    email_verified: VALID_PAYLOAD.email_verified,
    email_notifications_enabled: true,
    ...overrides,
  });

  return persistedUser;
}

describe('RegisterUser use-case', () => {
  let userDAO: MockUserDAO;
  let validator: MockValidator;
  let useCase: RegisterUser;

  beforeEach(() => {
    userDAO = {
      create: jest.fn(),
      updateSelfProfile: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      toggleBanUser: jest.fn(),
      unbanUser: jest.fn(),
      getUserScores: jest.fn(),
      setUserScores: jest.fn(),
      getUserSubmissions: jest.fn(),
      getLast5Submissions: jest.fn(),
      viewProfile: jest.fn(),
      toggleEmailNotifications: jest.fn(),
      updateUser: jest.fn(),
    } as unknown as MockUserDAO;

    validator = {
      validate: jest.fn(),
    } as unknown as MockValidator;

    useCase = new RegisterUser(userDAO, validator);
  });

  describe('successful registration', () => {
    it('creates a user and returns the persisted record', async () => {
      validator.validate.mockReturnValueOnce({
        success: true,
        data: VALID_PAYLOAD,
      });
      userDAO.findByEmail.mockResolvedValueOnce(null);
      const persistedUser = buildPersistedUser();
      userDAO.create.mockResolvedValueOnce(persistedUser);

      const result = await useCase.call(VALID_PAYLOAD);

      expect(validator.validate).toHaveBeenCalledWith(VALID_PAYLOAD);
      expect(userDAO.findByEmail).toHaveBeenCalledWith(VALID_PAYLOAD.email);
      expect(userDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: VALID_PAYLOAD.id,
          email: VALID_PAYLOAD.email,
          first_name: VALID_PAYLOAD.first_name,
          last_name: VALID_PAYLOAD.last_name,
          created_at: VALID_PAYLOAD.created_at,
          email_verified: VALID_PAYLOAD.email_verified,
          email_notifications_enabled: true,
          role: 'user',
          banned: false,
        }),
      );
      expect(result).toBe(persistedUser);
    });

    it('applies defaults for missing optional fields before persistence', async () => {
      const payload = {
        ...VALID_PAYLOAD,
        last_name: undefined,
        email_notifications_enabled: false,
      };

      validator.validate.mockReturnValueOnce({
        success: true,
        data: payload,
      });
      userDAO.findByEmail.mockResolvedValueOnce(null);
      const persistedUser = buildPersistedUser({
        last_name: 'Doey',
        email_notifications_enabled: true,
      });
      userDAO.create.mockResolvedValueOnce(persistedUser);

      const result = await useCase.call(payload);

      expect(userDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: VALID_PAYLOAD.first_name,
          last_name: 'Doey',
          email_notifications_enabled: true,
        }),
      );
      expect(result).toBe(persistedUser);
    });
  });

  describe('validation', () => {
    it('wraps a validator crash in an InternalServerError', async () => {
      validator.validate.mockImplementation(() => {
        throw new Error('validator crashed');
      });

      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new InternalServerError('User Input Validation Function Failed') as never,
      );

      expect(userDAO.findByEmail).not.toHaveBeenCalled();
      expect(userDAO.create).not.toHaveBeenCalled();
    });

    it('throws ValidationError when validation fails with details', async () => {
      const validationErrors = [
        { field: 'email', message: 'invalid email' },
        { field: 'id', message: 'id is required' },
      ];

      validator.validate.mockReturnValueOnce({
        success: false,
        errors: validationErrors,
      });

      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new ValidationError('Invalid user registration data', validationErrors) as never,
      );

      expect(userDAO.findByEmail).not.toHaveBeenCalled();
      expect(userDAO.create).not.toHaveBeenCalled();
    });

    it('throws ValidationError when validation succeeds without data', async () => {
      validator.validate.mockReturnValueOnce({
        success: true,
        data: undefined,
      });

      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new ValidationError('Invalid user registration data') as never,
      );

      expect(userDAO.findByEmail).not.toHaveBeenCalled();
      expect(userDAO.create).not.toHaveBeenCalled();
    });
  });

  describe('duplicate email', () => {
    it('rejects when the email already exists', async () => {
      validator.validate.mockReturnValueOnce({
        success: true,
        data: VALID_PAYLOAD,
      });
      userDAO.findByEmail.mockResolvedValueOnce(buildPersistedUser());

      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new ValidationError('Email is already in use', [
          { field: 'email', message: 'Email is already in use' },
        ]) as never,
      );

      expect(userDAO.create).not.toHaveBeenCalled();
    });
  });

  describe('dao failures', () => {
    it('wraps a findByEmail failure in an InternalServerError', async () => {
      validator.validate.mockReturnValueOnce({
        success: true,
        data: VALID_PAYLOAD,
      });
      userDAO.findByEmail.mockRejectedValueOnce(new Error('db unavailable'));

      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new InternalServerError('Failed to check if user already exists') as never,
      );

      expect(userDAO.create).not.toHaveBeenCalled();
    });

    it('wraps a create failure in an InternalServerError', async () => {
      validator.validate.mockReturnValueOnce({
        success: true,
        data: VALID_PAYLOAD,
      });
      userDAO.findByEmail.mockResolvedValueOnce(null);
      userDAO.create.mockRejectedValueOnce(new Error('insert failed'));

      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new InternalServerError('Error in creating user') as never,
      );
    });
  });
});
