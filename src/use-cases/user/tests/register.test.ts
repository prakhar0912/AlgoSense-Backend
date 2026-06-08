/**
 * Unit tests for the RegisterUser use‑case.
 *
 * What we verify:
 * 1. Successful registration — valid payload + free email → user created + token returned.
 * 2. Validator throws (unexpected) → InternalServerError.
 * 3. Validator reports failure → ValidationError with the error details.
 * 4. Duplicate email → ValidationError.
 * 5. DAO lookup failure → InternalServerError.
 * 6. Password hasher failure → InternalServerError.
 * 7. DAO.create failure → InternalServerError.
 * 8. Token generation failure → InternalServerError.
 *
 * All external collaborators (DAO, validator, hasher, token generator) are mocked
 * so the test exercises only the use‑case logic.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import RegisterUser from '../register.js';
import type IUseCase from '../../../interfaces/useCase.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
import type IValidator from '../../../interfaces/validator.js';
import type AuthUser from '../../../entities/authUser.js';
import type ILoginResponse from '../../../interfaces/user/loginResponse.js';
import { ValidationError } from '../../../errors/index.js';
import InternalServerError from '../../../errors/internalServerError.js';
import type User from '../../../entities/user.js';

// Helper types to keep mocks clean
type MockUserDAO = jest.Mocked<IUserDAO>;
type MockValidator = jest.Mocked<IValidator<AuthUser>>;

type IHashPassword = (password: string) => Promise<{ salt: string; hashedPassword: string }>;
type IGenerateToken = (userId: string) => string;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const VALID_PAYLOAD = {
  email: 'newuser@example.com',
  password: 'SecurePass123!',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email_notifications_enabled: true,
};

/** Creates a partial User shape that DAO.create might return. */
function buildPersistedUser(overrides: Partial<User & { password: string; salt: string }> = {}) {
  return {
    id: 'user-abc-123',
    email: VALID_PAYLOAD.email,
    first_name: VALID_PAYLOAD.first_name,
    last_name: VALID_PAYLOAD.last_name,
    role: 'user' as const,
    banned: false,
    scores: null,
    created_at: new Date(),
    submissions: null,
    email_verified: false,
    email_notifications_enabled: VALID_PAYLOAD.email_notifications_enabled,
    password: 'hashed-password',
    salt: 'random-salt',
    ...overrides,
  } as unknown as AuthUser & { id: string };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('RegisterUser use‑case', () => {
  let useCase: RegisterUser & IUseCase<ILoginResponse>;
  let userDAO: MockUserDAO;
  let validator: MockValidator;
  let hashPassword: jest.Mock<IHashPassword>;
  let generateToken: jest.Mock<IGenerateToken>;

  beforeEach(() => {
    // ------------- DAO mock -------------
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

    // ---------- Validator mock ----------
    validator = {
      validate: jest.fn(),
    } as unknown as MockValidator;

    // -------- Injected functions --------
    hashPassword = jest.fn();
    generateToken = jest.fn();

    // -------- Build the use‑case --------
    useCase = new RegisterUser(
      userDAO,
      validator,
      hashPassword,
      generateToken,
    );
  });

  // -----------------------------------------------------------------------
  // 1️⃣ Happy path — everything works end‑to‑end
  // -----------------------------------------------------------------------
  describe('#call() – successful registration', () => {
    it('should create a user and return a token when payload is valid and email is free', async () => {
      // Arrange
      validator.validate.mockReturnValueOnce({
        success: true,
        data: VALID_PAYLOAD as AuthUser,
      });
      userDAO.findByEmail.mockResolvedValueOnce(null);
      hashPassword.mockResolvedValueOnce({
        salt: 'random-salt',
        hashedPassword: 'hashed-password',
      });

      const persistedUser = buildPersistedUser();
      userDAO.create.mockResolvedValueOnce(persistedUser);
      generateToken.mockReturnValueOnce('jwt-token-123');

      // Act
      const result = await useCase.call(VALID_PAYLOAD);

      // Assert — validator called with raw payload
      expect(validator.validate).toHaveBeenCalledWith(VALID_PAYLOAD);

      // Assert — duplicate check
      expect(userDAO.findByEmail).toHaveBeenCalledWith(VALID_PAYLOAD.email);

      // Assert — password hasher called
      expect(hashPassword).toHaveBeenCalledWith(VALID_PAYLOAD.password);

      // Assert — DAO.create received the right shape
      expect(userDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: VALID_PAYLOAD.email,
          first_name: VALID_PAYLOAD.first_name,
          last_name: VALID_PAYLOAD.last_name,
          email_notifications_enabled: VALID_PAYLOAD.email_notifications_enabled,
          password: 'hashed-password',
          salt: 'random-salt',
          role: 'user',
          banned: false,
          created_at: expect.any(Date),
          email_verified: false,
        }),
      );

      // Assert — token generated with the new user's id
      expect(generateToken).toHaveBeenCalledWith(persistedUser.id);

      // Assert — return shape
      expect(result).toEqual({
        token: 'jwt-token-123',
        user: persistedUser,
      });
    });

    it('should allow registration with email_notifications_enabled set to false', async () => {
      // Arrange
      const payload = { ...VALID_PAYLOAD, email_notifications_enabled: false };

      validator.validate.mockReturnValueOnce({
        success: true,
        data: payload as AuthUser,
      });
      userDAO.findByEmail.mockResolvedValueOnce(null);
      hashPassword.mockResolvedValueOnce({
        salt: 'salt-a',
        hashedPassword: 'hash-a',
      });

      const persistedUser = buildPersistedUser({ email_notifications_enabled: false });
      userDAO.create.mockResolvedValueOnce(persistedUser);
      generateToken.mockReturnValueOnce('token-456');

      // Act
      const result = await useCase.call(payload);

      // Assert
      expect(userDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({ email_notifications_enabled: false }),
      );
      expect(result.user.email_notifications_enabled).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 2️⃣ Validator throws unexpectedly
  // -----------------------------------------------------------------------
  describe('#call() – validator throws', () => {
    it('should wrap a validator crash in InternalServerError', async () => {
      // Arrange
      validator.validate.mockImplementation(() => {
        throw new Error('Validator crashed');
      });

      // Act & Assert
      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new InternalServerError('User Input Validation Function Failed') as never,
      );

      // Ensure no downstream calls were made
      expect(userDAO.findByEmail).not.toHaveBeenCalled();
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userDAO.create).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 3️⃣ Validator rejects the payload
  // -----------------------------------------------------------------------
  describe('#call() – validator rejects payload', () => {
    it('should throw ValidationError with the validator errors when success is false', async () => {
      // Arrange
      const validationErrors = [
        { path: ['email'], message: 'must be a valid email' },
        { path: ['password'], message: 'must be at least 8 characters' },
      ];
      validator.validate.mockReturnValueOnce({
        success: false,
        errors: validationErrors,
      });

      // Act & Assert
      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new ValidationError(
          'Invalid user registration data',
          validationErrors,
        ) as never,
      );

      // Ensure we stopped at validation
      expect(userDAO.findByEmail).not.toHaveBeenCalled();
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userDAO.create).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when validator returns null data', async () => {
      // Arrange — !validationResult.data is true
      validator.validate.mockReturnValueOnce({
        success: true,
        data: null as unknown as AuthUser,
      });

      // Act & Assert
      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new ValidationError('Invalid user registration data') as never,
      );

      expect(userDAO.findByEmail).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when validator returns success=false without errors detail', async () => {
      // Arrange
      validator.validate.mockReturnValueOnce({
        success: false,
      });

      // Act & Assert
      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new ValidationError('Invalid user registration data') as never,
      );

      expect(userDAO.findByEmail).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 4️⃣ Duplicate email
  // -----------------------------------------------------------------------
  describe('#call() – duplicate email', () => {
    it('should throw ValidationError when the email is already registered', async () => {
      // Arrange
      validator.validate.mockReturnValueOnce({
        success: true,
        data: VALID_PAYLOAD as AuthUser,
      });
      userDAO.findByEmail.mockResolvedValueOnce({
        id: 'existing-user-id',
      } as AuthUser);

      // Act & Assert
      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new ValidationError('Email is already in use', [
          { path: ['email'], message: 'Email is already in use' },
        ]) as never,
      );

      // Should have stopped before hashing
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userDAO.create).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 5️⃣ DAO lookup failure
  // -----------------------------------------------------------------------
  describe('#call() – findByEmail DAO failure', () => {
    it('should wrap a DAO lookup error in InternalServerError', async () => {
      // Arrange
      validator.validate.mockReturnValueOnce({
        success: true,
        data: VALID_PAYLOAD as AuthUser,
      });
      userDAO.findByEmail.mockRejectedValueOnce(new Error('DB unreachable'));

      // Act & Assert
      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new InternalServerError('Failed to check if user already exists') as never,
      );

      // Should have stopped before hashing
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userDAO.create).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 6️⃣ Hashing failure
  // -----------------------------------------------------------------------
  describe('#call() – password hasher failure', () => {
    it('should wrap a hasher crash in InternalServerError', async () => {
      // Arrange
      validator.validate.mockReturnValueOnce({
        success: true,
        data: VALID_PAYLOAD as AuthUser,
      });
      userDAO.findByEmail.mockResolvedValueOnce(null);
      hashPassword.mockRejectedValueOnce(new Error('Hashing service down'));

      // Act & Assert
      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new InternalServerError('Failed to hash password') as never,
      );

      // Should have stopped before DAO.create
      expect(userDAO.create).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 7️⃣ DAO.create failure
  // -----------------------------------------------------------------------
  describe('#call() – DAO.create failure', () => {
    it('should wrap a DAO.create crash in InternalServerError', async () => {
      // Arrange
      validator.validate.mockReturnValueOnce({
        success: true,
        data: VALID_PAYLOAD as AuthUser,
      });
      userDAO.findByEmail.mockResolvedValueOnce(null);
      hashPassword.mockResolvedValueOnce({
        salt: 'salt-x',
        hashedPassword: 'hash-x',
      });
      userDAO.create.mockRejectedValueOnce(new Error('DB insert failed'));

      // Act & Assert
      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new InternalServerError('Error in creating user') as never,
      );

      // Token generation should not have been reached
      expect(generateToken).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 8️⃣ Token generation failure
  // -----------------------------------------------------------------------
  describe('#call() – token generator failure', () => {
    it('should wrap a token generator crash in InternalServerError', async () => {
      // Arrange
      validator.validate.mockReturnValueOnce({
        success: true,
        data: VALID_PAYLOAD as AuthUser,
      });
      userDAO.findByEmail.mockResolvedValueOnce(null);
      hashPassword.mockResolvedValueOnce({
        salt: 'salt-y',
        hashedPassword: 'hash-y',
      });
      const persistedUser = buildPersistedUser();
      userDAO.create.mockResolvedValueOnce(persistedUser);
      generateToken.mockImplementation(() => {
        throw new Error('Token service unavailable');
      });

      // Act & Assert
      await expect(useCase.call(VALID_PAYLOAD)).rejects.toMatchObject(
        new InternalServerError('Error in generating token') as never,
      );
    });
  });
});