import Problem from "../../entities/problem.js";
import Submission from "../../entities/submission.js";
import InternalServerError from "../../errors/internalServerError.js";
import NotFoundError from "../../errors/notFoundError.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type ISubmissionDAO from "../../interfaces/submission/submissionDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IValidator from "../../interfaces/validator.js";


export default class SubmitSolution implements IUseCase<Submission> {
    constructor(
        private problemDAO: IProblemDAO,
        private submissionDAO: ISubmissionDAO,
        private askGPT: (systemPrompt: Problem, userInput: string) => Promise<Partial<Submission>>,
        private submissionValidator: IValidator<Submission>
    ) { }
    async call(userId: string, problemId: string, userInput: string): Promise<Submission> {
        const problem = await this.problemDAO.findById(problemId)
        if (!problem) {
            throw new NotFoundError('Problem not found in DB')
        }
        const resp = await this.askGPT(problem, userInput)
        const { data, errors } = this.submissionValidator.validate(resp)
        if (errors && errors.length > 0 || !data) {
            throw new InternalServerError('The model responded incorrectly', errors)
        }
        if (data.approachScore === undefined || !data.edgeCaseScore || !data.identifiedApproach || !data.edgeCasesMissed || !data.missingPoints || !data.pass) {
            throw new InternalServerError('The model responded incorrectly')
        }
        try {
            let submission = this.submissionDAO.create({
                userId,
                problemId,
                userInput,
                approachScore: data.approachScore,
                identifiedApproach: data.identifiedApproach,
                pass: data.pass,
                missingPoints: data.missingPoints,
                edgeCasesMissed: data.edgeCasesMissed,
                edgeCaseScore: data.edgeCaseScore,
                submittedAt: new Date()
            })
            return submission
        }
        catch(e){
            throw new InternalServerError('Failed to add submission to database')
        }
        
    }
}