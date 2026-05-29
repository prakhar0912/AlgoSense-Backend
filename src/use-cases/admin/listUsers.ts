import type User from "../../entities/user.js";
import InternalServerError from "../../errors/internalServerError.js";
import type IPaginated from "../../interfaces/paginated.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class ListUsers implements IUseCase<IPaginated<User>> {
    constructor(
        private userDAO: IUserDAO
    ) { }
    async call(filters: Partial<User>): Promise<IPaginated<User>> {
        try {
            let usersData = await this.userDAO.findAll(filters)
            return {
                data: usersData.data,
                pagination: {
                    page: usersData.pagination.page,
                    perPage: usersData.pagination.perPage
                }
            }
        }
        catch(e){
            throw new InternalServerError('Unable to access users in the DB')
        }
    }
}