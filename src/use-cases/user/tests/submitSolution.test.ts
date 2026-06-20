import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import Problem from '../../../entities/problem.js';
import Submission from '../../../entities/submission.js';
import InternalServerError from '../../../errors/internalServerError.js';
import NotFoundError from '../../../errors/notFoundError.js';
import ValidationError from '../../../errors/validationError.js';
import type IProblemDAO from '../../../interfaces/problem/problemDAO.js';
import type ISubmissionDAO from '../../../interfaces/submission/submissionDAO.js';
import type IValidator from '../../../interfaces/validator.js';
import SubmitSolution from '../submitSolution.js';

type ModelResponse = {
  approach_score?: number | undefined;
  edge_case_score?: number | undefined;
  identified_approach?: string | undefined;
  edge_cases_missed?: string[] | undefined;
  missing_points?: string[] | undefined;
  pass?: boolean | undefined;
};

type AskGPT = (systemPrompt: Problem, userInput: string) => Promise<ModelResponse>;

function createProblem(overrides: Partial<Problem> = {}): Problem {
  return Object.assign(new Problem(), {
    id: 'problem-123',
    title: 'Sample Problem',
    description: 'Solve the sample problem',
    testCases: ['input -> output'],
    difficulty: 2.5 as const,
    approaches: [],
    evaluation_criteria: ['Correctness'],
    ...overrides,
  });
}

function createSubmission(overrides: Partial<Submission> = {}): Submission {
  return Object.assign(new Submission(), {
    id: 'submission-123',
    user_id: 'user-123',
    problem_id: 'problem-123',
    difficulty: 2.5,
    user_input: 'console.log("hello")',
    timer: null,
    approach_score: 9,
    identified_approach: 'Dynamic programming',
    pass: true,
    missing_points: [],
    edge_cases_missed: [],
    edge_case_score: 8,
    submitted_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });
}

describe('SubmitSolution', () => {
  let findById: jest.MockedFunction<IProblemDAO['findById']>;
  let submissionCreate: jest.MockedFunction<ISubmissionDAO['create']>;
  let askGPT: jest.MockedFunction<AskGPT>;
  let submissionValidatorValidate: jest.MockedFunction<
    IValidator<ModelResponse>['validate']
  >;
  let userSolutionValidatorValidate: jest.MockedFunction<
    IValidator<string>['validate']
  >;
  let problemDAO: IProblemDAO;
  let submissionDAO: ISubmissionDAO;
  let submissionValidator: IValidator<ModelResponse>;
  let userSolutionValidator: IValidator<string>;
  let submitSolution: SubmitSolution;

  beforeEach(() => {
    findById = jest.fn<IProblemDAO['findById']>();
    submissionCreate = jest.fn<ISubmissionDAO['create']>();
    askGPT = jest.fn<AskGPT>();
    submissionValidatorValidate = jest.fn<IValidator<ModelResponse>['validate']>();
    userSolutionValidatorValidate = jest.fn<IValidator<string>['validate']>();

    problemDAO = { findById } as unknown as IProblemDAO;
    submissionDAO = { create: submissionCreate } as unknown as ISubmissionDAO;
    submissionValidator = {
      validate: submissionValidatorValidate,
    } as unknown as IValidator<ModelResponse>;
    userSolutionValidator = {
      validate: userSolutionValidatorValidate,
    } as unknown as IValidator<string>;

    submitSolution = new SubmitSolution(
      problemDAO,
      submissionDAO,
      askGPT,
      submissionValidator,
      userSolutionValidator,
    );
  });

  describe('successful submission', () => {
    it('creates a submission when all validations and dependencies succeed', async () => {
      // Arrange
      const problem = createProblem();
      const userId = 'user-123';
      const problemId = 'problem-123';
      const userInput = 'console.log("hello")';
      const modelResponse: ModelResponse = {
        approach_score: 9,
        edge_case_score: 8,
        identified_approach: 'Dynamic programming',
        edge_cases_missed: ['edge case 1'],
        missing_points: ['point 1'],
        pass: true,
      };
      const persistedSubmission = createSubmission();

      userSolutionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: userInput,
      });
      findById.mockResolvedValueOnce(problem);
      askGPT.mockResolvedValueOnce(modelResponse);
      submissionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: modelResponse,
      });
      submissionCreate.mockResolvedValueOnce(persistedSubmission);

      // Act
      const result = await submitSolution.call(userId, problemId, userInput);

      // Assert
      expect(userSolutionValidatorValidate).toHaveBeenCalledTimes(1);
      expect(userSolutionValidatorValidate).toHaveBeenCalledWith(userInput);
      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(problemId);
      expect(askGPT).toHaveBeenCalledTimes(1);
      expect(askGPT).toHaveBeenCalledWith(problem, userInput);
      expect(submissionValidatorValidate).toHaveBeenCalledTimes(1);
      expect(submissionValidatorValidate).toHaveBeenCalledWith(modelResponse);
      expect(submissionCreate).toHaveBeenCalledTimes(1);
      expect(submissionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          problem_id: problemId,
          user_input: userInput,
          difficulty: problem.difficulty,
          approach_score: modelResponse.approach_score,
          identified_approach: modelResponse.identified_approach,
          pass: modelResponse.pass,
          missing_points: modelResponse.missing_points,
          edge_cases_missed: modelResponse.edge_cases_missed,
          edge_case_score: modelResponse.edge_case_score,
          submitted_at: expect.any(String),
        }),
      );
      expect(result).toBe(persistedSubmission);
      expect(userSolutionValidatorValidate.mock.invocationCallOrder[0]).toBeLessThan(
        findById.mock.invocationCallOrder[0]!,
      );
      expect(findById.mock.invocationCallOrder[0]).toBeLessThan(
        askGPT.mock.invocationCallOrder[0]!,
      );
      expect(askGPT.mock.invocationCallOrder[0]).toBeLessThan(
        submissionValidatorValidate.mock.invocationCallOrder[0]!,
      );
      expect(submissionValidatorValidate.mock.invocationCallOrder[0]).toBeLessThan(
        submissionCreate.mock.invocationCallOrder[0]!,
      );
    });

    it('passes the raw userInput through unchanged to the validator and model call', async () => {
      // Arrange
      const problem = createProblem();
      const rawUserInput = { source: 'non-string runtime value' };
      const validatedUserInput = JSON.stringify(rawUserInput);
      const modelResponse: ModelResponse = {
        approach_score: 7,
        edge_case_score: 6,
        identified_approach: 'Greedy',
        edge_cases_missed: ['edge'],
        missing_points: ['missing'],
        pass: false,
      };
      const persistedSubmission = createSubmission({ pass: false });

      userSolutionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: validatedUserInput,
      });
      findById.mockResolvedValueOnce(problem);
      askGPT.mockResolvedValueOnce(modelResponse);
      submissionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: modelResponse,
      });
      submissionCreate.mockResolvedValueOnce(persistedSubmission);

      // Act
      const result = await submitSolution.call(
        'user-123',
        'problem-123',
        rawUserInput as never,
      );

      // Assert
      expect(userSolutionValidatorValidate).toHaveBeenCalledWith(rawUserInput as never);
      expect(askGPT).toHaveBeenCalledWith(problem, validatedUserInput);
      expect(result).toBe(persistedSubmission);
    });
  });

  describe('user id validation', () => {
    it.each([
      ['an empty string', ''],
      ['a whitespace string', '   '],
      ['a number', 123],
      ['a boolean', false],
      ['null', null],
      ['undefined', undefined],
      ['an object', { id: 'user-123' }],
      ['an array', ['user-123']],
      ['a symbol', Symbol('user-id')],
      ['a bigint', 10n],
      ['a function', () => 'user-123'],
    ])('rejects %s before touching any dependency', async (_label, userId) => {
      // Act
      const promise = submitSolution.call(userId as never, 'problem-123', 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'User ID value invalid',
        httpStatusCode: 400,
      });
      expect(userSolutionValidatorValidate).not.toHaveBeenCalled();
      expect(findById).not.toHaveBeenCalled();
      expect(askGPT).not.toHaveBeenCalled();
      expect(submissionValidatorValidate).not.toHaveBeenCalled();
      expect(submissionCreate).not.toHaveBeenCalled();
    });
  });

  describe('problem id validation', () => {
    it.each([
      ['an empty string', ''],
      ['a whitespace string', '   '],
      ['a number', 123],
      ['a boolean', false],
      ['null', null],
      ['undefined', undefined],
      ['an object', { id: 'problem-123' }],
      ['an array', ['problem-123']],
      ['a symbol', Symbol('problem-id')],
      ['a bigint', 10n],
      ['a function', () => 'problem-123'],
    ])('rejects %s before touching any dependency', async (_label, problemId) => {
      // Act
      const promise = submitSolution.call('user-123', problemId as never, 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Problem ID value invalid',
        httpStatusCode: 400,
      });
      expect(userSolutionValidatorValidate).not.toHaveBeenCalled();
      expect(findById).not.toHaveBeenCalled();
      expect(askGPT).not.toHaveBeenCalled();
      expect(submissionValidatorValidate).not.toHaveBeenCalled();
      expect(submissionCreate).not.toHaveBeenCalled();
    });
  });

  describe('user input validation', () => {
    it('wraps a validator crash in an InternalServerError', async () => {
      // Arrange
      userSolutionValidatorValidate.mockImplementation(() => {
        throw new Error('validator crashed');
      });

      // Act
      const promise = submitSolution.call('user-123', 'problem-123', 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error validating user input',
        httpStatusCode: 500,
      });
      expect(findById).not.toHaveBeenCalled();
      expect(askGPT).not.toHaveBeenCalled();
      expect(submissionValidatorValidate).not.toHaveBeenCalled();
      expect(submissionCreate).not.toHaveBeenCalled();
    });

    it.each([
      ['an empty string', ''],
      ['a whitespace string', '   '],
      ['a number', 123],
      ['a boolean', false],
      ['null', null],
      ['undefined', undefined],
      ['an object', { source: 'console.log(1)' }],
      ['an array', ['console.log(1)']],
      ['a symbol', Symbol('user-input')],
      ['a bigint', 10n],
      ['a function', () => 'console.log(1)'],
    ])('forwards %s to the validator unchanged', async (_label, userInput) => {
      // Arrange
      userSolutionValidatorValidate.mockReturnValueOnce({
        success: false,
        errors: [{ path: ['userInput'], message: 'invalid input' }],
      });

      // Act
      const promise = submitSolution.call('user-123', 'problem-123', userInput as never);

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'User Input Invalid',
        httpStatusCode: 400,
      });
      expect(userSolutionValidatorValidate).toHaveBeenCalledTimes(1);
      expect(userSolutionValidatorValidate).toHaveBeenCalledWith(userInput as never);
      expect(findById).not.toHaveBeenCalled();
      expect(askGPT).not.toHaveBeenCalled();
      expect(submissionValidatorValidate).not.toHaveBeenCalled();
      expect(submissionCreate).not.toHaveBeenCalled();
    });

    it.each([
      ['validator returns false with no data', { success: false }],
      ['validator returns false with errors', {
        success: false,
        errors: [{ path: ['input'], message: 'invalid input' }],
      }],
      ['validator returns null data', {
        success: true,
        data: null,
      }],
      ['validator returns undefined data', {
        success: true,
        data: undefined,
      }],
      ['validator returns errors array even when success is true', {
        success: true,
        data: 'console.log(1)',
        errors: [{ path: ['input'], message: 'invalid input' }],
      }],
    ])('throws ValidationError when %s', async (_label, validationResult) => {
      // Arrange
      userSolutionValidatorValidate.mockReturnValueOnce(validationResult as ReturnType<
        typeof userSolutionValidatorValidate
      >);

      // Act
      const promise = submitSolution.call('user-123', 'problem-123', 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'User Input Invalid',
        httpStatusCode: 400,
      });
      expect(findById).not.toHaveBeenCalled();
      expect(askGPT).not.toHaveBeenCalled();
      expect(submissionValidatorValidate).not.toHaveBeenCalled();
      expect(submissionCreate).not.toHaveBeenCalled();
    });
  });

  describe('problem lookup', () => {
    it('wraps an Error thrown by the DAO in an InternalServerError', async () => {
      // Arrange
      userSolutionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: 'console.log(1)',
      });
      findById.mockRejectedValueOnce(new Error('database unavailable'));

      // Act
      const promise = submitSolution.call('user-123', 'problem-123', 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error while fetching problem from DB',
        httpStatusCode: 500,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(askGPT).not.toHaveBeenCalled();
      expect(submissionCreate).not.toHaveBeenCalled();
    });

    it('wraps a non-Error rejection from the DAO in an InternalServerError', async () => {
      // Arrange
      userSolutionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: 'console.log(1)',
      });
      findById.mockRejectedValueOnce('database failure');

      // Act
      const promise = submitSolution.call('user-123', 'problem-123', 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error while fetching problem from DB',
        httpStatusCode: 500,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(askGPT).not.toHaveBeenCalled();
      expect(submissionCreate).not.toHaveBeenCalled();
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
    ])('rejects when the DAO returns %s', async (_label, problem) => {
      // Arrange
      userSolutionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: 'console.log(1)',
      });
      findById.mockResolvedValueOnce(problem as Problem | null);

      // Act
      const promise = submitSolution.call('user-123', 'problem-123', 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'NotFoundError',
        message: 'Problem not found in DB',
        httpStatusCode: 404,
      });
      expect(findById).toHaveBeenCalledTimes(1);
      expect(askGPT).not.toHaveBeenCalled();
      expect(submissionCreate).not.toHaveBeenCalled();
    });
  });

  describe('model response handling', () => {
    it('wraps a model crash in an InternalServerError', async () => {
      // Arrange
      const problem = createProblem();
      userSolutionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: 'console.log(1)',
      });
      findById.mockResolvedValueOnce(problem);
      askGPT.mockRejectedValueOnce(new Error('model offline'));

      // Act
      const promise = submitSolution.call('user-123', 'problem-123', 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error while fetching response from model',
        httpStatusCode: 500,
      });
      expect(askGPT).toHaveBeenCalledTimes(1);
      expect(submissionValidatorValidate).not.toHaveBeenCalled();
      expect(submissionCreate).not.toHaveBeenCalled();
    });

    it('wraps a non-Error rejection from the model in an InternalServerError', async () => {
      // Arrange
      const problem = createProblem();
      userSolutionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: 'console.log(1)',
      });
      findById.mockResolvedValueOnce(problem);
      askGPT.mockRejectedValueOnce('model offline');

      // Act
      const promise = submitSolution.call('user-123', 'problem-123', 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error while fetching response from model',
        httpStatusCode: 500,
      });
      expect(askGPT).toHaveBeenCalledTimes(1);
      expect(submissionValidatorValidate).not.toHaveBeenCalled();
      expect(submissionCreate).not.toHaveBeenCalled();
    });

    it('wraps a validator crash for the model response in an InternalServerError', async () => {
      // Arrange
      const problem = createProblem();
      userSolutionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: 'console.log(1)',
      });
      findById.mockResolvedValueOnce(problem);
      askGPT.mockResolvedValueOnce({
        approach_score: 9,
        edge_case_score: 8,
        identified_approach: 'Dynamic programming',
        edge_cases_missed: ['edge case 1'],
        missing_points: ['point 1'],
        pass: true,
      });
      submissionValidatorValidate.mockImplementation(() => {
        throw new Error('submission validator crashed');
      });

      // Act
      const promise = submitSolution.call('user-123', 'problem-123', 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Error while validating model response',
        httpStatusCode: 500,
      });
      expect(submissionCreate).not.toHaveBeenCalled();
    });

    it.each([
      ['validator returns false without data', {
        success: false,
        errors: [{ path: ['approach_score'], message: 'invalid' }],
      }],
      ['validator returns null data', {
        success: true,
        data: null,
      }],
      ['validator returns undefined data', {
        success: true,
        data: undefined,
      }],
      ['validator returns errors array', {
        success: true,
        data: {
          approach_score: 9,
          edge_case_score: 8,
          identified_approach: 'Dynamic programming',
          edge_cases_missed: ['edge case 1'],
          missing_points: ['point 1'],
          pass: true,
        },
        errors: [{ path: ['approach_score'], message: 'invalid' }],
      }],
    ])('throws InternalServerError when %s', async (_label, validationResult) => {
      // Arrange
      const problem = createProblem();
      userSolutionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: 'console.log(1)',
      });
      findById.mockResolvedValueOnce(problem);
      askGPT.mockResolvedValueOnce({
        approach_score: 9,
        edge_case_score: 8,
        identified_approach: 'Dynamic programming',
        edge_cases_missed: ['edge case 1'],
        missing_points: ['point 1'],
        pass: true,
      });
      submissionValidatorValidate.mockReturnValueOnce(validationResult as ReturnType<
        typeof submissionValidatorValidate
      >);

      // Act
      const promise = submitSolution.call('user-123', 'problem-123', 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'The model responded incorrectly',
        httpStatusCode: 500,
      });
      expect(submissionCreate).not.toHaveBeenCalled();
    });

    it.each([
      ['approach_score is undefined', { approach_score: undefined }],
      ['edge_case_score is undefined', { edge_case_score: undefined }],
      ['identified_approach is undefined', { identified_approach: undefined }],
      ['edge_cases_missed is undefined', { edge_cases_missed: undefined }],
      ['missing_points is undefined', { missing_points: undefined }],
      ['pass is undefined', { pass: undefined }],
    ])('rejects when %s', async (_label, partialOverrides) => {
      // Arrange
      const problem = createProblem();
      const modelResponse: ModelResponse = {
        approach_score: 9,
        edge_case_score: 8,
        identified_approach: 'Dynamic programming',
        edge_cases_missed: ['edge case 1'],
        missing_points: ['point 1'],
        pass: true,
        ...partialOverrides,
      };

      userSolutionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: 'console.log(1)',
      });
      findById.mockResolvedValueOnce(problem);
      askGPT.mockResolvedValueOnce(modelResponse);
      submissionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: modelResponse,
      });

      // Act
      const promise = submitSolution.call('user-123', 'problem-123', 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'The model responded incorrectly',
        httpStatusCode: 500,
      });
      expect(submissionCreate).not.toHaveBeenCalled();
    });
  });

  describe('submission persistence', () => {
    it('wraps a DAO create error in an InternalServerError', async () => {
      // Arrange
      const problem = createProblem();
      const modelResponse: ModelResponse = {
        approach_score: 9,
        edge_case_score: 8,
        identified_approach: 'Dynamic programming',
        edge_cases_missed: ['edge case 1'],
        missing_points: ['point 1'],
        pass: true,
      };

      userSolutionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: 'console.log(1)',
      });
      findById.mockResolvedValueOnce(problem);
      askGPT.mockResolvedValueOnce(modelResponse);
      submissionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: modelResponse,
      });
      submissionCreate.mockRejectedValueOnce(new Error('insert failed'));

      // Act
      const promise = submitSolution.call('user-123', 'problem-123', 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Failed to add submission to database',
        httpStatusCode: 500,
      });
      expect(submissionCreate).toHaveBeenCalledTimes(1);
    });

    it('wraps a non-Error rejection from the DAO create call in an InternalServerError', async () => {
      // Arrange
      const problem = createProblem();
      const modelResponse: ModelResponse = {
        approach_score: 9,
        edge_case_score: 8,
        identified_approach: 'Dynamic programming',
        edge_cases_missed: ['edge case 1'],
        missing_points: ['point 1'],
        pass: true,
      };

      userSolutionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: 'console.log(1)',
      });
      findById.mockResolvedValueOnce(problem);
      askGPT.mockResolvedValueOnce(modelResponse);
      submissionValidatorValidate.mockReturnValueOnce({
        success: true,
        data: modelResponse,
      });
      submissionCreate.mockRejectedValueOnce('insert failed');

      // Act
      const promise = submitSolution.call('user-123', 'problem-123', 'console.log(1)');

      // Assert
      await expect(promise).rejects.toMatchObject({
        name: 'InternalServerError',
        message: 'Failed to add submission to database',
        httpStatusCode: 500,
      });
      expect(submissionCreate).toHaveBeenCalledTimes(1);
    });
  });
});
