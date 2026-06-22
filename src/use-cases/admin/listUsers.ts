import type User from "../../entities/user.js";
import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
import type IPaginated from "../../interfaces/paginated.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class ListUsers implements IUseCase<IPaginated<User>> {
    constructor(
        private userDAO: IUserDAO
    ) { }
    async call(filters: Partial<User>, page: number = 1, perPage: number = 10): Promise<IPaginated<User>> {
        if (page < 1 || perPage < 1 || !Number.isInteger(page) || !Number.isInteger(perPage) || !Number.isFinite(page) || !Number.isFinite(perPage)) {
            throw new ValidationError('Page and perPage must be positive whole integers')
        }
        let usersData: IPaginated<User>
        try {
            usersData = await this.userDAO.findAll(filters, page, perPage)
        }
        catch (e) {
            throw new InternalServerError('Unable to access users in the DB', e)
        }
        return usersData
    }
}