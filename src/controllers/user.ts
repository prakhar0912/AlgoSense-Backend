import type Problem from "../entities/problem.js";
import type Submission from "../entities/submission.js";
import type User from "../entities/user.js";
import type UserScores from "../entities/userScores.js";
import InternalServerError from "../errors/internalServerError.js";
import ValidationError from "../errors/validationError.js";
import type IPaginated from "../interfaces/paginated.js";
import type IRequest from "../interfaces/request.js";
import type IUseCase from "../interfaces/useCase.js";
import type IValidator from "../interfaces/validator.js";

type profileDataTypes = Pick<User, 'first_name' | 'last_name' | 'email_notifications_enabled'>


export default class UserController {
    constructor(
        protected authorizeUser: IUseCase<User>,
        protected deleteSelf: IUseCase<boolean>,
        protected listProblems: IUseCase<IPaginated<Problem>>,
        protected getProblem: IUseCase<Problem>,
        protected submitSolution: IUseCase<Submission>,
        protected updateConsistencyScore: IUseCase<UserScores>,
        protected updatePassword: IUseCase<boolean>,
        protected updateUserScore: IUseCase<UserScores>,
        protected updateUserSettings: IUseCase<User>,

        // Validators
        protected profileDataValidator: IValidator<profileDataTypes>,

    ) { }

    async deleteSelfUser(request: IRequest): Promise<boolean> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        try {
            const user = await this.authorizeUser.call(request.token)
            return await this.deleteSelf.call(user.id)
        } catch (e) {
            throw e
        }
    }

    async getPaginatedProblems(request: IRequest): Promise<IPaginated<Problem>> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const page = request.params?.page;
        const perPage = request.params?.perPage;

        if (
            (page !== undefined && typeof page !== 'number') ||
            (perPage !== undefined && typeof perPage !== 'number')
        ) {
            throw new ValidationError('Params are required to be numbers');
        }

        try {
            const user = await this.authorizeUser.call(request.token)
            return await this.listProblems.call(page, perPage)
        } catch (e) {
            throw e
        }
    }

    async getProblemById(request: IRequest): Promise<Problem> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        if (!request.params || !request.params.id || typeof request.params.id !== "string") {
            throw new ValidationError('Id is required')
        }
        try {
            const user = await this.authorizeUser.call(request.token)
            return await this.getProblem.call(request.params.id)
        } catch (e) {
            throw e
        }
    }

    async submitAnswer(request: IRequest): Promise<{ result: Submission, prevScores: UserScores | null | undefined, newScores: UserScores }> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        if (!request.body || typeof request.body !== "object") {
            throw new ValidationError('Request body is required')
        }
        const body = request.body as { problem_id: string; userInput: string }

        if (!body.problem_id || typeof body.problem_id !== "string") {
            throw new ValidationError('Problem ID is not valid')
        }
        if (!body.userInput || typeof body.userInput !== "string") {
            throw new ValidationError('Answer isn\'t valid')
        }


        try {
            const user = await this.authorizeUser.call(request.token)
            const result = await this.submitSolution.call(user.id, body.problem_id, body.userInput)
            const newScores = await this.updateUserScore.call(user.id, user.scores, result.approach_score, result.edge_case_score)
            return {
                result,
                prevScores: user.scores,
                newScores
            }
        } catch (e) {
            throw e
        }
    }

    async updateConsistencyScores(request: IRequest): Promise<UserScores> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        try {
            const user = await this.authorizeUser.call(request.token)
            return await this.updateConsistencyScore.call(user.id, user.scores)
        }
        catch (e) {
            throw e
        }
    }

    async updateSelfPassword(request: IRequest): Promise<boolean> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        if (!request.body || typeof request.body !== "object") {
            throw new ValidationError('Request body is required')
        }
        const body = request.body as { newPassword: string, retypedNewPassword: string }
        if (!body.newPassword || typeof body.newPassword !== "string") {
            throw new ValidationError('New Password is required')
        }
        if (!body.retypedNewPassword || typeof body.retypedNewPassword !== "string") {
            throw new ValidationError('Retyped New Password is required')
        }
        try {
            const user = await this.authorizeUser.call(request.token)
            return await this.updatePassword.call(user.id, body.newPassword, body.retypedNewPassword)
        }
        catch (e) {
            throw e
        }
    }

    async updateSelfProfile(request: IRequest): Promise<User> {

        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        if (!request.body || typeof request.body !== "object") {
            throw new ValidationError('Request body is required')
        }
        let validationResult
        try {
            validationResult = this.profileDataValidator.validate(request.body as profileDataTypes)
        } catch (e) {
            throw new InternalServerError('User Input Validation Function Failed', e)
        }
        if (!validationResult.success || !validationResult.data || validationResult.errors) {
            throw new ValidationError('Invalid user profile data', validationResult.errors)
        }


        try {
            const user = await this.authorizeUser.call(request.token)
            return await this.updateUserSettings.call(user.id, validationResult.data as profileDataTypes)
        }
        catch (e) {
            throw e
        }
    }

}