import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import Problem from '../../../entities/problem.js';
import ShortSubmission from '../../../entities/shortSubmission.js';
import Submission from '../../../entities/submission.js';
import User from '../../../entities/user.js';
import UserScores from '../../../entities/userScores.js';
import InternalServerError from '../../../errors/internalServerError.js';
import NotFoundError from '../../../errors/notFoundError.js';
import ValidationError from '../../../errors/validationError.js';
import type IProblemDAO from '../../../interfaces/problem/problemDAO.js';
import type ISubmissionDAO from '../../../interfaces/submission/submissionDAO.js';
import type IUserDAO from '../../../interfaces/user/userDAO.js';
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
    missing_points: ['point 1'],
    edge_cases_missed: ['edge case 1'],
    edge_case_score: 8,
    submitted_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });
}

function createShortSubmission(index: number, submittedAt: string): ShortSubmission {
  return Object.assign(new ShortSubmission(), {
    submission_id: `submission-${index}`,
    problem_id: `problem-${index}`,
    difficulty: 2.5,
    timer: index % 2 === 0 ? index : null,
    approach_score: 10 + index,
    identified_approach: `approach-${index}`,
    pass: index % 2 === 0,
    edge_case_score: 5 + index,
    submitted_at: submittedAt,
  });
}

function createUserScores(overrides: Partial<UserScores> = {}): UserScores {
  const scores = new UserScores();
  Object.assign(scores, {
    approaches_score: 40,
    consistency_score: 25,
    edge_case_score: 400,
    days_logged_in: ['2026-01-01T00:00:00.000Z'],
    ...overrides,
  });
  scores.total_score = scores.approaches_score + scores.consistency_score + scores.edge_case_score;
  return scores;
}

function createExistingSubmissions(): ShortSubmission[] {
  return [
    createShortSubmission(3, '2026-01-03T00:00:00.000Z'),
    createShortSubmission(1, '2026-01-01T00:00:00.000Z'),
    createShortSubmission(6, '2026-01-06T00:00:00.000Z'),
    createShortSubmission(2, '2026-01-02T00:00:00.000Z'),
    createShortSubmission(5, '2026-01-05T00:00:00.000Z'),
    createShortSubmission(4, '2026-01-04T00:00:00.000Z'),
  ];
}

describe('SubmitSolution', () => {
  let findById: jest.MockedFunction<IProblemDAO['findById']>;
  let submissionCreate: jest.MockedFunction<ISubmissionDAO['create']>;
  let setUserScores: jest.MockedFunction<IUserDAO['setUserScores']>;
  let setSubmissionsInProfile: jest.MockedFunction<IUserDAO['setSubmissionsInProfile']>;
  let askGPT: jest.MockedFunction<AskGPT>;
  let submissionValidatorValidate: jest.MockedFunction<IValidator<ModelResponse>['validate']>;
  let userSolutionValidatorValidate: jest.MockedFunction<IValidator<string>['validate']>;
  let submitSolution: SubmitSolution;

  beforeEach(() => {
    findById = jest.fn<IProblemDAO['findById']>();
    submissionCreate = jest.fn<ISubmissionDAO['create']>();
    setUserScores = jest.fn<IUserDAO['setUserScores']>();
    setSubmissionsInProfile = jest.fn<IUserDAO['setSubmissionsInProfile']>();
    askGPT = jest.fn<AskGPT>();
    submissionValidatorValidate = jest.fn<IValidator<ModelResponse>['validate']>();
    userSolutionValidatorValidate = jest.fn<IValidator<string>['validate']>();

    const userDAO = {
      setUserScores,
      setSubmissionsInProfile,
    } as unknown as IUserDAO;
    const problemDAO = { findById } as unknown as IProblemDAO;
    const submissionDAO = { create: submissionCreate } as unknown as ISubmissionDAO;
    const submissionValidator = {
      validate: submissionValidatorValidate,
    } as unknown as IValidator<ModelResponse>;
    const userSolutionValidator = {
      validate: userSolutionValidatorValidate,
    } as unknown as IValidator<string>;

    submitSolution = new SubmitSolution(
      userDAO,
      problemDAO,
      submissionDAO,
      askGPT,
      submissionValidator,
      userSolutionValidator,
    );
  });

  it('creates a submission, updates scores, and refreshes the last five submissions list', async () => {
    const userId = 'user-123';
    const problemId = 'problem-123';
    const userInput = 'console.log("hello")';
    const problem = createProblem();
    const existingScores = createUserScores();
    const existingSubmissions = createExistingSubmissions();
    const modelResponse: ModelResponse = {
      approach_score: 9,
      edge_case_score: 8,
      identified_approach: 'Dynamic programming',
      edge_cases_missed: ['edge case 1'],
      missing_points: ['point 1'],
      pass: true,
    };
    const persistedSubmission = createSubmission();
    const expectedScores = createUserScores({
      approaches_score: 65,
      consistency_score: 25,
      edge_case_score: 600,
    });
    const expectedProfile = [
      Object.assign(new ShortSubmission(), {
        submission_id: persistedSubmission.id,
        problem_id: persistedSubmission.problem_id,
        difficulty: persistedSubmission.difficulty,
        timer: persistedSubmission.timer ?? null,
        approach_score: persistedSubmission.approach_score,
        identified_approach: persistedSubmission.identified_approach,
        pass: persistedSubmission.pass,
        edge_case_score: persistedSubmission.edge_case_score,
        submitted_at: persistedSubmission.submitted_at,
      }),
      existingSubmissions[2],
      existingSubmissions[4],
      existingSubmissions[5],
      existingSubmissions[0],
    ] as ShortSubmission[];

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
    setUserScores.mockResolvedValueOnce(expectedScores);
    setSubmissionsInProfile.mockResolvedValueOnce(expectedProfile);

    const result = await submitSolution.call(
      userId,
      existingScores,
      existingSubmissions,
      problemId,
      userInput,
    );

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
    expect(setUserScores).toHaveBeenCalledTimes(1);
    expect(setUserScores).toHaveBeenCalledWith(userId, {
      approaches_score: 65,
      edge_case_score: 600,
    });
    expect(setSubmissionsInProfile).toHaveBeenCalledTimes(1);
    expect(setSubmissionsInProfile).toHaveBeenCalledWith(userId, expectedProfile);
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
    expect(submissionCreate.mock.invocationCallOrder[0]).toBeLessThan(
      setUserScores.mock.invocationCallOrder[0]!,
    );
    expect(setUserScores.mock.invocationCallOrder[0]).toBeLessThan(
      setSubmissionsInProfile.mock.invocationCallOrder[0]!,
    );
  });

  it('passes the raw user input through to the validator and model call', async () => {
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
    const updatedScores = createUserScores({
      approaches_score: 55,
      edge_case_score: 500,
    });

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
    setUserScores.mockResolvedValueOnce(updatedScores);
    setSubmissionsInProfile.mockResolvedValueOnce([
      Object.assign(new ShortSubmission(), {
        submission_id: persistedSubmission.id,
        problem_id: persistedSubmission.problem_id,
        difficulty: persistedSubmission.difficulty,
        timer: persistedSubmission.timer ?? null,
        approach_score: persistedSubmission.approach_score,
        identified_approach: persistedSubmission.identified_approach,
        pass: persistedSubmission.pass,
        edge_case_score: persistedSubmission.edge_case_score,
        submitted_at: persistedSubmission.submitted_at,
      }),
    ]);

    const result = await submitSolution.call(
      'user-123',
      null,
      null,
      'problem-123',
      rawUserInput as never,
    );

    expect(userSolutionValidatorValidate).toHaveBeenCalledWith(rawUserInput as never);
    expect(askGPT).toHaveBeenCalledWith(problem, validatedUserInput);
    expect(result).toBe(persistedSubmission);
  });

  it.each([
    ['an empty string', ''],
    ['a whitespace string', '   '],
    ['a number', 123],
    ['a boolean', false],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s user IDs before touching dependencies', async (_label, userId) => {
    await expect(
      submitSolution.call(userId as never, null, null, 'problem-123', 'console.log(1)'),
    ).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'User ID value invalid',
      httpStatusCode: 400,
    });

    expect(userSolutionValidatorValidate).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
    expect(askGPT).not.toHaveBeenCalled();
    expect(submissionCreate).not.toHaveBeenCalled();
    expect(setUserScores).not.toHaveBeenCalled();
    expect(setSubmissionsInProfile).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty string', ''],
    ['a whitespace string', '   '],
    ['a number', 123],
    ['a boolean', false],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s problem IDs before touching dependencies', async (_label, problemId) => {
    await expect(
      submitSolution.call('user-123', null, null, problemId as never, 'console.log(1)'),
    ).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'Problem ID value invalid',
      httpStatusCode: 400,
    });

    expect(userSolutionValidatorValidate).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
    expect(askGPT).not.toHaveBeenCalled();
    expect(submissionCreate).not.toHaveBeenCalled();
    expect(setUserScores).not.toHaveBeenCalled();
    expect(setSubmissionsInProfile).not.toHaveBeenCalled();
  });

  it('wraps a user input validator crash in an InternalServerError', async () => {
    userSolutionValidatorValidate.mockImplementation(() => {
      throw new Error('validator crashed');
    });

    await expect(
      submitSolution.call('user-123', null, null, 'problem-123', 'console.log(1)'),
    ).rejects.toMatchObject({
      name: 'InternalServerError',
      message: 'Error validating user input',
      httpStatusCode: 500,
    });

    expect(findById).not.toHaveBeenCalled();
    expect(askGPT).not.toHaveBeenCalled();
    expect(submissionCreate).not.toHaveBeenCalled();
    expect(setUserScores).not.toHaveBeenCalled();
    expect(setSubmissionsInProfile).not.toHaveBeenCalled();
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
  ])('throws ValidationError when %s', async (_label, validationResult) => {
    userSolutionValidatorValidate.mockReturnValueOnce(validationResult as ReturnType<
      typeof userSolutionValidatorValidate
    >);

    await expect(
      submitSolution.call('user-123', null, null, 'problem-123', 'console.log(1)'),
    ).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'User Input Invalid',
      httpStatusCode: 400,
    });

    expect(findById).not.toHaveBeenCalled();
    expect(askGPT).not.toHaveBeenCalled();
    expect(submissionCreate).not.toHaveBeenCalled();
    expect(setUserScores).not.toHaveBeenCalled();
    expect(setSubmissionsInProfile).not.toHaveBeenCalled();
  });

  it('wraps an Error thrown by the DAO in an InternalServerError', async () => {
    userSolutionValidatorValidate.mockReturnValueOnce({
      success: true,
      data: 'console.log(1)',
    });
    findById.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(
      submitSolution.call('user-123', null, null, 'problem-123', 'console.log(1)'),
    ).rejects.toMatchObject({
      name: 'InternalServerError',
      message: 'Error while fetching problem from DB',
      httpStatusCode: 500,
    });

    expect(findById).toHaveBeenCalledTimes(1);
    expect(askGPT).not.toHaveBeenCalled();
    expect(submissionCreate).not.toHaveBeenCalled();
    expect(setUserScores).not.toHaveBeenCalled();
    expect(setSubmissionsInProfile).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the DAO returns null', async () => {
    userSolutionValidatorValidate.mockReturnValueOnce({
      success: true,
      data: 'console.log(1)',
    });
    findById.mockResolvedValueOnce(null);

    await expect(
      submitSolution.call('user-123', null, null, 'problem-123', 'console.log(1)'),
    ).rejects.toMatchObject({
      name: 'NotFoundError',
      message: 'Problem not found in DB',
      httpStatusCode: 404,
    });

    expect(findById).toHaveBeenCalledTimes(1);
    expect(askGPT).not.toHaveBeenCalled();
    expect(submissionCreate).not.toHaveBeenCalled();
    expect(setUserScores).not.toHaveBeenCalled();
    expect(setSubmissionsInProfile).not.toHaveBeenCalled();
  });

  it('wraps model validation failures in an InternalServerError', async () => {
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

    await expect(
      submitSolution.call('user-123', null, null, 'problem-123', 'console.log(1)'),
    ).rejects.toMatchObject({
      name: 'InternalServerError',
      message: 'Error while validating model response',
      httpStatusCode: 500,
    });

    expect(submissionCreate).not.toHaveBeenCalled();
    expect(setUserScores).not.toHaveBeenCalled();
    expect(setSubmissionsInProfile).not.toHaveBeenCalled();
  });

  it('throws InternalServerError when the model response is malformed', async () => {
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
    submissionValidatorValidate.mockReturnValueOnce({
      success: true,
      data: {
        approach_score: 9,
        edge_case_score: undefined,
        identified_approach: 'Dynamic programming',
        edge_cases_missed: ['edge case 1'],
        missing_points: ['point 1'],
        pass: true,
      },
    });

    await expect(
      submitSolution.call('user-123', null, null, 'problem-123', 'console.log(1)'),
    ).rejects.toMatchObject({
      name: 'InternalServerError',
      message: 'The model responded incorrectly',
      httpStatusCode: 500,
    });

    expect(submissionCreate).not.toHaveBeenCalled();
    expect(setUserScores).not.toHaveBeenCalled();
    expect(setSubmissionsInProfile).not.toHaveBeenCalled();
  });

  it('wraps submission persistence failures in an InternalServerError', async () => {
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

    await expect(
      submitSolution.call('user-123', null, null, 'problem-123', 'console.log(1)'),
    ).rejects.toMatchObject({
      name: 'InternalServerError',
      message: 'Failed to add submission to database',
      httpStatusCode: 500,
    });

    expect(submissionCreate).toHaveBeenCalledTimes(1);
    expect(setUserScores).not.toHaveBeenCalled();
    expect(setSubmissionsInProfile).not.toHaveBeenCalled();
  });

  it('wraps score persistence failures in an InternalServerError', async () => {
    const problem = createProblem();
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
      data: 'console.log(1)',
    });
    findById.mockResolvedValueOnce(problem);
    askGPT.mockResolvedValueOnce(modelResponse);
    submissionValidatorValidate.mockReturnValueOnce({
      success: true,
      data: modelResponse,
    });
    submissionCreate.mockResolvedValueOnce(persistedSubmission);
    setUserScores.mockRejectedValueOnce(new Error('scores unavailable'));

    await expect(
      submitSolution.call('user-123', null, null, 'problem-123', 'console.log(1)'),
    ).rejects.toMatchObject({
      name: 'InternalServerError',
      message: 'Unable to store new Scores.',
      httpStatusCode: 500,
    });

    expect(submissionCreate).toHaveBeenCalledTimes(1);
    expect(setUserScores).toHaveBeenCalledTimes(1);
    expect(setSubmissionsInProfile).not.toHaveBeenCalled();
  });

  it('wraps last five submission persistence failures in an InternalServerError', async () => {
    const problem = createProblem();
    const modelResponse: ModelResponse = {
      approach_score: 9,
      edge_case_score: 8,
      identified_approach: 'Dynamic programming',
      edge_cases_missed: ['edge case 1'],
      missing_points: ['point 1'],
      pass: true,
    };
    const persistedSubmission = createSubmission();
    const existingScores = createUserScores();
    const existingSubmissions = createExistingSubmissions();

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
    submissionCreate.mockResolvedValueOnce(persistedSubmission);
    setUserScores.mockResolvedValueOnce(createUserScores({
      approaches_score: 65,
      consistency_score: 25,
      edge_case_score: 600,
    }));
    setSubmissionsInProfile.mockRejectedValueOnce(new Error('profile submissions unavailable'));

    await expect(
      submitSolution.call('user-123', existingScores, existingSubmissions, 'problem-123', 'console.log(1)'),
    ).rejects.toMatchObject({
      name: 'InternalServerError',
      message: 'Unable to store new Submission Data to Database.',
      httpStatusCode: 500,
    });

    expect(submissionCreate).toHaveBeenCalledTimes(1);
    expect(setUserScores).toHaveBeenCalledTimes(1);
    expect(setSubmissionsInProfile).toHaveBeenCalledTimes(1);
  });

  it('builds the next last five submissions array with the newest submission first', async () => {
    const problem = createProblem();
    const modelResponse: ModelResponse = {
      approach_score: 9,
      edge_case_score: 8,
      identified_approach: 'Dynamic programming',
      edge_cases_missed: ['edge case 1'],
      missing_points: ['point 1'],
      pass: true,
    };
    const persistedSubmission = createSubmission();
    const existingScores = createUserScores();
    const existingSubmissions = createExistingSubmissions();

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
    submissionCreate.mockResolvedValueOnce(persistedSubmission);
    setUserScores.mockResolvedValueOnce(createUserScores({
      approaches_score: 65,
      consistency_score: 25,
      edge_case_score: 600,
    }));
    setSubmissionsInProfile.mockResolvedValueOnce([]);

    await submitSolution.call(
      'user-123',
      existingScores,
      existingSubmissions,
      'problem-123',
      'console.log(1)',
    );

    const payload = setSubmissionsInProfile.mock.calls[0]?.[1] as ShortSubmission[];
    expect(payload).toHaveLength(5);
    expect(payload[0]).toBeInstanceOf(ShortSubmission);
    expect(payload[0]).toMatchObject({
      submission_id: persistedSubmission.id,
      problem_id: persistedSubmission.problem_id,
      difficulty: persistedSubmission.difficulty,
      timer: null,
      approach_score: persistedSubmission.approach_score,
      identified_approach: persistedSubmission.identified_approach,
      pass: persistedSubmission.pass,
      edge_case_score: persistedSubmission.edge_case_score,
      submitted_at: persistedSubmission.submitted_at,
    });
    expect(payload.slice(1).map((submission) => submission.submission_id)).toEqual([
      'submission-6',
      'submission-5',
      'submission-4',
      'submission-3',
    ]);
  });

  it('starts the last five submissions list when the user has no prior submissions', async () => {
    const problem = createProblem();
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
      data: 'console.log(1)',
    });
    findById.mockResolvedValueOnce(problem);
    askGPT.mockResolvedValueOnce(modelResponse);
    submissionValidatorValidate.mockReturnValueOnce({
      success: true,
      data: modelResponse,
    });
    submissionCreate.mockResolvedValueOnce(persistedSubmission);
    setUserScores.mockResolvedValueOnce(createUserScores({
      approaches_score: 55,
      edge_case_score: 500,
    }));
    setSubmissionsInProfile.mockResolvedValueOnce([
      Object.assign(new ShortSubmission(), {
        submission_id: persistedSubmission.id,
        problem_id: persistedSubmission.problem_id,
        difficulty: persistedSubmission.difficulty,
        timer: persistedSubmission.timer ?? null,
        approach_score: persistedSubmission.approach_score,
        identified_approach: persistedSubmission.identified_approach,
        pass: persistedSubmission.pass,
        edge_case_score: persistedSubmission.edge_case_score,
        submitted_at: persistedSubmission.submitted_at,
      }),
    ]);

    await submitSolution.call(
      'user-123',
      null,
      null,
      'problem-123',
      'console.log(1)',
    );

    expect(setSubmissionsInProfile).toHaveBeenCalledWith(
      'user-123',
      expect.arrayContaining([
        expect.objectContaining({
          submission_id: persistedSubmission.id,
        }),
      ]),
    );
    const payload = setSubmissionsInProfile.mock.calls[0]?.[1] as ShortSubmission[];
    expect(payload).toHaveLength(1);
    expect(payload[0]).toBeInstanceOf(ShortSubmission);
    expect(payload[0]?.submission_id).toBe(persistedSubmission.id);
  });
});
