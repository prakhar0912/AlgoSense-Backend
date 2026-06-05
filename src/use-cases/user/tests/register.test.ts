/**
 * Unit tests for the RegisterUser use‑case.
 *
 * What we verify:
 * 1. Successful registration when input is valid and email is free.
 * 2. ValidationError is thrown when the incoming payload fails validation.
 * 3. ValidationError is thrown when the email is already in use.
 * 4. InternalServerError is thrown when the DAO.create() or token generation fails unexpectedly.
 *
 * All external collaborators (DAO, validator, password hasher, token generator)
 * are mocked so the test exercises only the use‑case logic.
 */
// import * as jest from 'ts-jest'

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import RegisterUser from '../register.js';
import type IUseCase from '../../../interfaces/useCase.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
import type IValidator from '../../../interfaces/validator.js';
import type AuthUser from '../../../entities/authUser.js';
import type ILoginResponse from '../../../interfaces/user/loginResponse.js';
import { ValidationError } from '../../../errors/index.js';
import InternalServerError from '../../../errors/internalServerError.js';
type IHashPassword = (password: string) => Promise<{salt: string; hashedPassword: string}>
type IGenerateToken = (userId: string) => string

// Helper types to make the mocks clearer
type MockUserDAO = jest.Mocked<IUserDAO>;
type MockValidator = jest.Mocked<IValidator<AuthUser>>;

// -----------------------------------------------------------------------------
// Test suite
// -----------------------------------------------------------------------------
describe('RegisterUser use‑case', () => {
  let useCase: RegisterUser & IUseCase<ILoginResponse>;
  let userDAO: MockUserDAO;
  let validator: MockValidator;
  let hashPassword: jest.Mock<IHashPassword>;
  let generateToken: jest.Mock<IGenerateToken>;

  const basePayload = {
    email: 'newuser@example.com',
    password: 'SecurePass123!',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email_notifications_enabled: true,
  };

  // -------------------------------------------------------------------------
  // Before each test we create fresh mocks and inject them into the use‑case.
  // -------------------------------------------------------------------------
  beforeEach(() => {
    // --- DAO mock -----------------------------------------------------------
    userDAO = {
      create: jest.fn(),
      // the other methods aren’t used by RegisterUser, but we need to satisfy the type
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

    // --- Validator mock -----------------------------------------------------
    validator = {
      validate: jest.fn(),
    } as unknown as MockValidator;

    // --- Password hasher ----------------------------------------------------
    hashPassword = jest.fn();
    // --- Token generator ----------------------------------------------------
    generateToken = jest.fn();

    // --- Build the use‑case with the mocks ----------------------------------
    useCase = new RegisterUser(
      userDAO,
      validator,
      hashPassword,
      generateToken
    );
  });

  // -------------------------------------------------------------------------
  // 1️⃣ Happy‑path: valid input + free email
  // -------------------------------------------------------------------------
  it('should register a user and return a token when email is available', async () => {
    // Arrange: validator says payload is good
    validator.validate.mockReturnValueOnce({
      success: true,
      data: basePayload as AuthUser, // we assert the shape matches AuthUser
    });

    // Arrange: no existing user with that email
    userDAO.findByEmail.mockResolvedValueOnce(null);

    // Arrange: hashing returns a salt + hash
    hashPassword.mockResolvedValueOnce({
      salt: 'random-salt',
      hashedPassword: 'hashed-password',
    });

    // Arrange: DAO.create returns a full User entity (we only need the fields
    // that RegisterUser reads back – id is required for token generation)
    const persistedUser = {
      id: 'user-123',
      email: basePayload.email,
      first_name: basePayload.first_name,
      last_name: basePayload.last_name,
      role: 'user',
      banned: false,
      scores: null,
      created_at: new Date(),
      submissions: null,
      email_verified: false,
      email_notifications_enabled: basePayload.email_notifications_enabled,
      // AuthUser‑specific fields (added by the DAO after hashing):
      password: 'hashed-password',
      salt: 'random-salt',
      retypedPassword: undefined,
    } as unknown as AuthUser & { id: string }; // mimic the shape the use‑case expects

    userDAO.create.mockResolvedValueOnce(persistedUser);

    // Arrange: token generator returns a JWT string
    generateToken.mockReturnValueOnce("fake-jwt-token");

    // Act
    const result = await useCase.call(basePayload);

    // Assert
    expect(validator.validate).toHaveBeenCalledWith(basePayload);
    expect(userDAO.findByEmail).toHaveBeenCalledWith(basePayload.email);
    expect(hashPassword).toHaveBeenCalledWith(basePayload.password);
    expect(userDAO.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: basePayload.email,
        first_name: basePayload.first_name,
        last_name: basePayload.last_name,
        email_notifications_enabled: basePayload.email_notifications_enabled,
        password: 'hashed-password',
        salt: 'random-salt',
        role: 'user',
        banned: false,
        created_at: expect.any(Date),
        email_verified: false,
      })
    );
    expect(generateToken).toHaveBeenCalledWith(persistedUser.id);
    expect(result).toEqual({
      token: 'fake-jwt-token',
      user: {
        id: persistedUser.id,
        email: persistedUser.email,
        first_name: persistedUser.first_name,
        last_name: persistedUser.last_name,
        role: persistedUser.role,
        banned: persistedUser.banned,
        scores: persistedUser.scores,
        created_at: persistedUser.created_at,
        submissions: persistedUser.submissions,
        email_verified: persistedUser.email_verified,
        email_notifications_enabled: persistedUser.email_notifications_enabled,
      },
    });
  });

  // -------------------------------------------------------------------------
  // 2️⃣ Validation fails – use‑case should propagate the ValidationError
  // -------------------------------------------------------------------------
  it('should throw ValidationError when the validator rejects the payload', async () => {
    // Arrange: validator reports failure
    validator.validate.mockReturnValueOnce({
      success: false,
      errors: [{ path: ['email'], message: 'must be a valid email' }],
    });

    // Act & Assert
    await expect(useCase.call(basePayload)).rejects.toMatchObject(
      new ValidationError('Invalid user registration data', [
        { path: ['email'], message: 'must be a valid email' },
      ]) as never
    );

    // Ensure we never touched the DAO or hasher
    expect(userDAO.findByEmail).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userDAO.create).not.toHaveBeenCalled();
    expect(generateToken).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3️⃣ Email already in use – use‑case should throw a ValidationError
  // -------------------------------------------------------------------------
  it('should throw ValidationError when email is already registered', async () => {
    // Arrange: validator passes
    validator.validate.mockReturnValueOnce({
      success: true,
      data: basePayload as AuthUser,
    });

    // Arrange: DAO finds an existing user
    userDAO.findByEmail.mockResolvedValueOnce({
      id: 'existing-user',
      email: basePayload.email,
      // ...other fields omitted – we only need the truthiness
    } as unknown as AuthUser);

    // Act & Assert
    await expect(useCase.call(basePayload)).rejects.toMatchObject(
      new ValidationError('Email is already in use', [
        { path: ['email'], message: 'Email is already in use' },
      ]) as never
    );

    // Ensure we stopped after the duplicate‑email check
    expect(userDAO.findByEmail).toHaveBeenCalledWith(basePayload.email);
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userDAO.create).not.toHaveBeenCalled();
    expect(generateToken).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4️⃣ Unexpected failure in DAO.create or token generation → InternalServerError
  // -------------------------------------------------------------------------
  it('should wrap unexpected DAO.create errors in InternalServerError', async () => {
    // Arrange: validator passes
    validator.validate.mockReturnValueOnce({
      success: true,
      data: basePayload as AuthUser,
    });
    // Arrange: email is free
    userDAO.findByEmail.mockResolvedValueOnce(null);
    // Arrange: hashing works
    hashPassword.mockResolvedValueOnce({
      salt: 'salt',
      hashedPassword: 'hash',
    });
    // Arrange: DAO.create throws
    userDAO.create.mockRejectedValueOnce(new Error('DB exploded'));

    // Act & Assert
    await expect(useCase.call(basePayload)).rejects.toMatchObject(
      new InternalServerError('Error in creating user or token!') as never
    );
  });

  it('should wrap unexpected token generation errors in InternalServerError', async () => {
    // Arrange: validator passes
    validator.validate.mockReturnValueOnce({
      success: true,
      data: basePayload as AuthUser,
    });
    // Arrange: email free
    userDAO.findByEmail.mockResolvedValueOnce(null);
    // Arrange: hashing works
    hashPassword.mockResolvedValueOnce({
      salt: 'salt',
      hashedPassword: 'hash',
    });
    // Arrange: DAO.create works
    const persistedUser = {
      id: 'user-456',
      email: basePayload.email,
      first_name: basePayload.first_name,
      last_name: basePayload.last_name,
      role: 'user',
      banned: false,
      scores: null,
      created_at: new Date(),
      submissions: null,
      email_verified: false,
      email_notifications_enabled: basePayload.email_notifications_enabled,
      password: 'hash',
      salt: 'salt',
      retypedPassword: undefined,
    } as unknown as AuthUser & { id: string };
    userDAO.create.mockResolvedValueOnce(persistedUser);
    // Arrange: token generator throws
    generateToken.mockImplementation(() => {
      throw new Error("Token factory broken");
    });

    // Act & Assert
    await expect(useCase.call(basePayload)).rejects.toMatchObject(
      new InternalServerError('Error in creating user or token!') as never
    );
  });
});
