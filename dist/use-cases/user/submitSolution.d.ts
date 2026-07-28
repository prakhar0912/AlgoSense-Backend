import Problem from "../../entities/problem.js";
import Submission from "../../entities/submission.js";
import User from "../../entities/user.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type ISubmissionDAO from "../../interfaces/submission/submissionDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IValidator from "../../interfaces/validator.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type ModelResponse from "../../interfaces/problem/modelResponse.js";
export default class SubmitSolution implements IUseCase<Submission> {
    private userDAO;
    private problemDAO;
    private submissionDAO;
    private askGPT;
    private submissionValidator;
    private userSolutionValidator;
    constructor(userDAO: IUserDAO, problemDAO: IProblemDAO, submissionDAO: ISubmissionDAO, askGPT: (systemPrompt: Problem, userInput: string) => Promise<ModelResponse>, submissionValidator: IValidator<ModelResponse>, userSolutionValidator: IValidator<string>);
    call(userId: string, userScores: User['scores'], last5submissions: User['last_5_submissions'], problemId: string, userInput: string): Promise<Submission>;
}
//# sourceMappingURL=submitSolution.d.ts.map