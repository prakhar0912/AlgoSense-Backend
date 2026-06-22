import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import Problem from '../../../entities/problem.js';
import InternalServerError from '../../../errors/internalServerError.js';
import { ValidationError } from '../../../errors/index.js';
import type IProblemDAO from '../../../interfaces/problem/problemDAO.js';
import type IValidator from '../../../interfaces/validator.js';
import UpdateProblem from '../updateProblem.js';

type ProblemPayload = Partial<Problem>;

function createProblemPayload(overrides: ProblemPayload = {}): ProblemPayload {
  return {
    title: 'Sample Problem',
    description: 'Solve the sample problem',
    testCases: ['input -> output'],
    difficulty: 1,
    approaches: [
      {
        type: 'two pointers',
        primary_technique: 'sliding window',
        time_complexity: 'O(n)',
        space_complexity: 'O(1)',
        req_or_constraints: 'Array input',
        steps: ['Initialize pointers', 'Move pointers toward each other'],
        explanation: 'A simple linear scan with two moving pointers.',
        edge_cases: [
          { case: 'empty array', importance: 10 },
        ],
      },
    ],
    evaluation_criteria: ['Correctness', 'Efficiency'],
    ...overrides,
  };
}

function createProblem(overrides: Partial<Problem> = {}): Problem {
  return Object.assign(new Problem(), {
    id: 'problem-123',
    title: 'Sample Problem',
    description: 'Solve the sample problem',
    testCases: ['input -> output'],
    difficulty: 1 as const,
    approaches: [],
    evaluation_criteria: ['Correctness'],
    ...overrides,
  });
}

describe('UpdateProblem', () => {
  let update: jest.MockedFunction<IProblemDAO['update']>;
  let validateProblem: jest.MockedFunction<IValidator<Problem>['validate']>;
  let problemDAO: IProblemDAO;
  let validator: IValidator<Problem>;
  let updateProblem: UpdateProblem;

  beforeEach(() => {
    update = jest.fn<IProblemDAO['update']>();
    validateProblem = jest.fn<IValidator<Problem>['validate']>();
    problemDAO = { update } as unknown as IProblemDAO;
    validator = { validate: validateProblem } as unknown as IValidator<Problem>;
    updateProblem = new UpdateProblem(problemDAO, validator);
  });

  describe('successful update', () => {
    it('returns the exact problem created by the DAO when validation succeeds', async () => {
      // Arrange
      const problemId = 'problem-123';
      const payload = createProblemPayload();
      const validatedProblem = createProblem({ id: problemId });
      validateProblem.mockReturnValueOnce({
        success: true,
        data: validatedProblem,
      });
      update.mockResolvedValueOnce(validatedProblem);

      // Act
      const result = await updateProblem.call(problemId, payload);

      // Assert
      expect(validateProblem).toHaveBeenCalledTimes(1);
      expect(validateProblem).toHaveBeenCalledWith(payload);
      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(problemId, validatedProblem);
      expect(result).toBe(validatedProblem);
    });

    it.each([
      ['difficulty 1', 1],
      ['difficulty 2.5', 2.5],
      ['difficulty 6', 6],
      ['difficulty 7', 7],
    ])('accepts %s in the payload', async (_label, difficulty) => {
      // Arrange
      const problemId = 'problem-123';
      const payload = createProblemPayload({ difficulty });
      const validatedProblem = createProblem({ id: problemId, difficulty: difficulty as Problem['difficulty'] });
      validateProblem.mockReturnValueOnce({
        success: true,
        data: validatedProblem,
      });
      update.mockResolvedValueOnce(validatedProblem);

      // Act
      const result = await updateProblem.call(problemId, payload);

      // Assert
      expect(validateProblem).toHaveBeenCalledWith(payload);
      expect(update).toHaveBeenCalledWith(problemId, validatedProblem);
      expect(result).toBe(validatedProblem);
    });

    it('forwards a payload with an omitted primary_technique in an approach', async () => {
      // Arrange
      const problemId = 'problem-123';
      const payload = createProblemPayload({
        approaches: [
          {
            type: 'dynamic programming',
            time_complexity: 'O(n^2)',
            space_complexity: 'O(n)',
            req_or_constraints: 'String input',
            steps: ['Build table', 'Fill table'],
            explanation: 'Use overlapping subproblems.',
            edge_cases: [{ case: 'empty string', importance: 5 }],
          },
        ],
      });
      const validatedProblem = createProblem({ id: problemId });
      validateProblem.mockReturnValueOnce({
        success: true,
        data: validatedProblem,
      });
      update.mockResolvedValueOnce(validatedProblem);

      // Act
      const result = await updateProblem.call(problemId, payload);

      // Assert
      expect(validateProblem).toHaveBeenCalledWith(payload);
      expect(update).toHaveBeenCalledWith(problemId, validatedProblem);
      expect(result).toBe(validatedProblem);
    });

    it.each([
      ['a normal problem id', 'problem-123'],
      ['an empty problem id', ''],
      ['a whitespace problem id', '   '],
      ['a numeric-looking problem id', '000123'],
      ['a long problem id', 'problem-' + 'x'.repeat(64)],
      ['a unicode problem id', 'problem-Δειγμα'],
    ])('forwards %s unchanged to the DAO', async (_label, problemId) => {
      // Arrange
      const payload = createProblemPayload();
      const validatedProblem = createProblem({ id: `validated-${problemId || 'empty'}` });
      validateProblem.mockReturnValueOnce({
        success: true,
        data: validatedProblem,
      });
      update.mockResolvedValueOnce(validatedProblem);

      // Act
      const result = await updateProblem.call(problemId, payload);

      // Assert
      expect(validateProblem).toHaveBeenCalledWith(payload);
      expect(update).toHaveBeenCalledWith(problemId, validatedProblem);
      expect(result).toBe(validatedProblem);
    });
  });

  describe('validation', () => {
    it('wraps a validator crash in an InternalServerError and preserves the original error', async () => {
      // Arrange
      const originalError = new Error('validator crashed');
      validateProblem.mockImplementation(() => {
        throw originalError;
      });

      // Act
      const promise = updateProblem.call('problem-123', createProblemPayload());

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Problem validator function failed',
        httpStatusCode: 500,
        originalError,
      });
      expect(update).not.toHaveBeenCalled();
    });

    it('wraps a non-Error validator failure in an InternalServerError and preserves the original value', async () => {
      // Arrange
      const originalError = 'validator crashed';
      validateProblem.mockImplementation(() => {
        throw originalError;
      });

      // Act
      const promise = updateProblem.call('problem-123', createProblemPayload());

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Problem validator function failed',
        httpStatusCode: 500,
        originalError,
      });
      expect(update).not.toHaveBeenCalled();
    });

    it.each([
      ['success false without errors', { success: false }],
      ['success false with errors', {
        success: false,
        errors: [{ path: ['title'], message: 'title is required' }],
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
        data: createProblemPayload(),
        errors: [{ path: ['difficulty'], message: 'difficulty is invalid' }],
      }],
    ])('throws ValidationError when %s', async (_label, validationResult) => {
      // Arrange
      const problemId = 'problem-123';
      const payload = createProblemPayload();
      validateProblem.mockReturnValueOnce(validationResult as ReturnType<typeof validateProblem>);

      // Act
      const promise = updateProblem.call(problemId, payload);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Problem Data Invalid.',
        httpStatusCode: 400,
      });
      expect(validateProblem).toHaveBeenCalledTimes(1);
      expect(validateProblem).toHaveBeenCalledWith(payload);
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('database persistence', () => {
    it('wraps an Error thrown by the DAO in an InternalServerError and preserves the original error', async () => {
      // Arrange
      const problemId = 'problem-123';
      const payload = createProblemPayload();
      const validatedProblem = createProblem({ id: problemId });
      const originalError = new Error('database unavailable');
      validateProblem.mockReturnValueOnce({
        success: true,
        data: validatedProblem,
      });
      update.mockRejectedValueOnce(originalError);

      // Act
      const promise = updateProblem.call(problemId, payload);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to update the problem to the DB',
        httpStatusCode: 500,
        originalError,
      });
      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(problemId, validatedProblem);
    });

    it('wraps a non-Error rejection from the DAO in an InternalServerError and preserves the original value', async () => {
      // Arrange
      const problemId = 'problem-123';
      const payload = createProblemPayload();
      const validatedProblem = createProblem({ id: problemId });
      const originalError = 'database failure';
      validateProblem.mockReturnValueOnce({
        success: true,
        data: validatedProblem,
      });
      update.mockRejectedValueOnce(originalError);

      // Act
      const promise = updateProblem.call(problemId, payload);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Unable to update the problem to the DB',
        httpStatusCode: 500,
        originalError,
      });
      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(problemId, validatedProblem);
    });
  });
});
