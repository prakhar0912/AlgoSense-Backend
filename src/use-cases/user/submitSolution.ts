import Problem from "../../entities/problem.js";
import Submission from "../../entities/submission.js";
import InternalServerError from "../../errors/internalServerError.js";
import NotFoundError from "../../errors/notFoundError.js";
import ValidationError from "../../errors/validationError.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type ISubmissionDAO from "../../interfaces/submission/submissionDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type { IValidatorResult } from "../../interfaces/validator.js";
import type IValidator from "../../interfaces/validator.js";
type ModelResponse = {
  approach_score?: number | undefined;
  edge_case_score?: number | undefined;
  identified_approach?: string | undefined;
  edge_cases_missed?: string[] | undefined;
  missing_points?: string[] | undefined;
  pass?: boolean | undefined;
};


export default class SubmitSolution implements IUseCase<Submission> {
    constructor(
        private problemDAO: IProblemDAO,
        private submissionDAO: ISubmissionDAO,
        private askGPT: (systemPrompt: Problem, userInput: string) => Promise<ModelResponse>,
        private submissionValidator: IValidator<ModelResponse>,
        private userSolutionValidator: IValidator<string>
    ) { }
    async call(userId: string, problemId: string, userInput: string): Promise<Submission> {
        
        if (typeof userId !== "string" || typeof userId === "string" && userId.trim().length === 0) {
            throw new ValidationError('User ID value invalid')
        }
        
        if (typeof problemId !== "string" || typeof problemId === "string" && problemId.trim().length === 0) {
            throw new ValidationError('Problem ID value invalid')
        }



        let validatedUserInput: IValidatorResult<string>
        try {
            validatedUserInput = this.userSolutionValidator.validate(userInput)
        } catch (e) {
            throw new InternalServerError('Error validating user input')
        }
        if (validatedUserInput.errors && validatedUserInput.errors.length > 0 || !validatedUserInput.success || !validatedUserInput.data) {
            throw new ValidationError('User Input Invalid', validatedUserInput.errors)
        }



        let problem: Problem | null | undefined
        try {
            problem = await this.problemDAO.findById(problemId)
        }
        catch (e) {
            throw new InternalServerError('Error while fetching problem from DB')
        }
        if (!problem) {
            throw new NotFoundError('Problem not found in DB')
        }


        let modelResp
        try {
            modelResp = await this.askGPT(problem, validatedUserInput.data)
        }
        catch (e) {
            throw new InternalServerError('Error while fetching response from model')
        }

        let validatedModelResp: IValidatorResult<ModelResponse>
        try{
            validatedModelResp = this.submissionValidator.validate(modelResp)
        }
        catch(e){
            throw new InternalServerError('Error while validating model response')
        }
        const { data, errors } = validatedModelResp
        if (errors && errors.length > 0 || !data) {
            throw new InternalServerError('The model responded incorrectly', errors)
        }
        if (!data.approach_score || !data.edge_case_score || !data.identified_approach || !data.edge_cases_missed || !data.missing_points || typeof data.pass !== 'boolean') {
            throw new InternalServerError('The model responded incorrectly')
        }


        let submission: Submission
        try {
            submission = await this.submissionDAO.create({
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
        }
        catch (e) {
            throw new InternalServerError('Failed to add submission to database')
        }
        return submission

    }
}