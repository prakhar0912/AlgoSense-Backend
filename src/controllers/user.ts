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
        protected submitSolution: IUseCase<Submission>,
        protected updateConsistencyScore: IUseCase<UserScores>,
        protected updatePassword: IUseCase<boolean>,
        protected updateUserScore: IUseCase<UserScores>,
        protected updateUserSettings: IUseCase<User>,

        // Validators
        protected profileDataValidator: IValidator<profileDataTypes>,

    ) { }


    private validatePaginationParams(params?: IRequest['params']) {
        const page = params?.page;
        const perPage = params?.perPage;

        if (
            (page !== undefined && typeof page !== 'number') ||
            (perPage !== undefined && typeof perPage !== 'number')
        ) {
            throw new ValidationError('Params are required to be numbers');
        }

        return { page, perPage };
    }

    //Helper Functions above


    async deleteSelfUser(request: IRequest): Promise<boolean> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const user = await this.authorizeUser.call(request.token)
        return await this.deleteSelf.call(user.id)
    }

   

    async submitAnswer(request: IRequest): Promise<{ result: Submission, prevScores: UserScores | null | undefined, newScores: UserScores }> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const user = await this.authorizeUser.call(request.token)

        if (!request.body || typeof request.body !== "object") {
            throw new ValidationError('Request body is required')
        }
        const body = request.body as { problem_id: string; userInput: string }
        if (!body.problem_id || typeof body.problem_id !== "string") {
            throw new ValidationError('Problem ID is not valid')
        }
        if (!body.userInput || typeof body.userInput !== "string") {
            throw new ValidationError('Answer isn\'t of valid type: string')
        }


        const result = await this.submitSolution.call(user.id, body.problem_id, body.userInput)
        const newScores = await this.updateUserScore.call(user.id, user.scores, result.approach_score, result.edge_case_score)
        return {
            result,
            prevScores: user.scores,
            newScores
        }
    }

    async updateConsistencyScores(request: IRequest): Promise<UserScores> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const user = await this.authorizeUser.call(request.token)
        return await this.updateConsistencyScore.call(user.id, user.scores)
    }

    async updateSelfPassword(request: IRequest): Promise<boolean> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const user = await this.authorizeUser.call(request.token)
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
        return await this.updatePassword.call(user.id, body.newPassword, body.retypedNewPassword)

    }

    async updateSelfProfile(request: IRequest): Promise<User> {

        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }

        const user = await this.authorizeUser.call(request.token)

        let validationResult
        try {
            validationResult = this.profileDataValidator.validate(request.body as profileDataTypes)
        } catch (e) {
            throw new InternalServerError('User Input Validation Function Failed', e)
        }
        if (!validationResult.success || !validationResult.data || validationResult.errors) {
            throw new ValidationError('Invalid user profile data', validationResult.errors)
        }


        return await this.updateUserSettings.call(user.id, validationResult.data as profileDataTypes)

    }

}