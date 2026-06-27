import type Problem from "../entities/problem.js";
import type User from "../entities/user.js";
import InternalServerError from "../errors/internalServerError.js";
import ValidationError from "../errors/validationError.js";
import type IPaginated from "../interfaces/paginated.js";
import type IRequest from "../interfaces/request.js";
import type IUseCase from "../interfaces/useCase.js";
import type IValidator from "../interfaces/validator.js";

export default class AdminController {
    constructor(
        protected authorizeAdmin: IUseCase<User>,
        protected listUsers: IUseCase<IPaginated<User>>,
        protected removeUser: IUseCase<boolean>,
        protected toggleBanUser: IUseCase<User>,
        protected updateUser: IUseCase<User>,

        protected userFiltersDataTypeValidator: IValidator<User>,
        protected updateUserDataTypeValidator: IValidator<User>

    ) { }


    private validatePaginationParams(params?: IRequest['params']): { page: number | undefined, perPage: number | undefined } {
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

    //Helper Functions Above


    async listFilteredUsers(request: IRequest): Promise<IPaginated<User>> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const user = await this.authorizeAdmin.call(request.token)

        const { page, perPage } = this.validatePaginationParams(request.params)

        let validationResult
        try {
            validationResult = this.userFiltersDataTypeValidator.validate(request.body as Partial<User>)
        } catch (e) {
            throw new InternalServerError('User Filter Data Validation Function Failed', e)
        }
        if (!validationResult.success || !validationResult.data || validationResult.errors) {
            throw new ValidationError('Invalid User Filter Data', validationResult.errors)
        }

        const filteredUsers = await this.listUsers.call(validationResult.data, page, perPage)
        return filteredUsers
    }

    async deleteUser(request: IRequest): Promise<boolean> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const user = await this.authorizeAdmin.call(request.token)

        let userId = request.params?.Id
        if (!userId || typeof userId !== "string") {
            throw new ValidationError('User Id is required')
        }
        const deletedUser = await this.removeUser.call(userId)
        return deletedUser

    }

    async toggleBanOnUser(request: IRequest): Promise<User> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const user = await this.authorizeAdmin.call(request.token)

        const requestBody = request.body as { id?: string; isBanned?: boolean }
        if (!requestBody || typeof requestBody !== "object") {
            throw new ValidationError('Body is required')
        }
        const userId = requestBody.id
        const isBanned = requestBody.isBanned
        if (typeof userId !== "string") {
            throw new ValidationError('User Id is required')
        }
        if (typeof isBanned !== "boolean") {
            throw new ValidationError('isBanned is required')
        }
        const alteredUser = await this.toggleBanUser.call({ id: userId, isBanned })
        return alteredUser
    }

    async updateUserById(request: IRequest): Promise<User> {
        if (!request.token || typeof request.token !== "string") {
            throw new ValidationError('Token is required')
        }
        const user = await this.authorizeAdmin.call(request.token)


        let validationResult
        try {
            validationResult = this.updateUserDataTypeValidator.validate(request.body as Partial<User>)
        } catch (e) {
            throw new InternalServerError('Problem Data Validation Function Failed', e)
        }
        if (!validationResult.success || !validationResult.data || validationResult.errors) {
            throw new ValidationError('Invalid Problem Data', validationResult.errors)
        }

        const userId = request.params?.id
        if (!userId || typeof userId !== "string") {
            throw new ValidationError('Problem ID is required')
        }

        const updatedUser = await this.updateUser.call(userId, validationResult.data)
        return updatedUser

    }
}