import Problem from "../../entities/problem.js";
import Submission from "../../entities/submission.js";
import InternalServerError from "../../errors/internalServerError.js";
import NotFoundError from "../../errors/notFoundError.js";
import ValidationError from "../../errors/validationError.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type ISubmissionDAO from "../../interfaces/submission/submissionDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type IValidator from "../../interfaces/validator.js";


export default class SubmitSolution implements IUseCase<Submission> {
    constructor(
        private problemDAO: IProblemDAO,
        private submissionDAO: ISubmissionDAO,
        private askGPT: (systemPrompt: Problem, userInput: string) => Promise<Partial<Submission>>,
        private submissionValidator: IValidator<Submission>,
        private userSolutionValidator: IValidator<string>
    ) { }
    async call(userId: string, problemId: string, userInput: string): Promise<Submission> {
        if (!problemId) {
            throw new ValidationError('Problem ID value not provided')
        }
        const { data: userValidatedAnswer, errors: userAnswerErrors } = this.userSolutionValidator.validate(userInput)
        if (userAnswerErrors && userAnswerErrors.length > 0 || !userValidatedAnswer) {
            throw new ValidationError('User Input Invalid', userAnswerErrors)
        }


        const problem = await this.problemDAO.findById(problemId)
        if (!problem) {
            throw new NotFoundError('Problem not found in DB')
        }
        const resp = await this.askGPT(problem, userValidatedAnswer)
        const { data, errors } = this.submissionValidator.validate(resp)
        if (errors && errors.length > 0 || !data) {
            throw new InternalServerError('The model responded incorrectly', errors)
        }
        if (data.approach_score == null || !data.edge_case_score || !data.identified_approach || !data.edge_cases_missed || !data.missing_points || !data.pass) {
            throw new InternalServerError('The model responded incorrectly')
        }
        try {
            let submission = this.submissionDAO.create({
                user_id: userId,
                problem_id: problemId,
                user_input: userInput,
                difficulty: problem.difficulty,
                approach_score: data.approach_score,
                identified_approach: data.identified_approach,
                pass: data.pass,
                missing_points: data.missing_points,
                edge_cases_missed: data.edge_cases_missed,
                edge_case_score: data.edge_case_score,
                submitted_at: new Date().toISOString()
            })
            return submission
        }
        catch (e) {
            throw new InternalServerError('Failed to add submission to database')
        }

    }
}