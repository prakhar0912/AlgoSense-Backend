import type User from "../../entities/user.js";
import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
import type IPaginated from "../../interfaces/paginated.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class ToggleBanUser implements IUseCase<User> {
    constructor(
        private userDAO: IUserDAO
    ) { }
    async call(userId: string, toggle: boolean): Promise<User> {
        if(toggle == null){
            throw new ValidationError('Toggle value not provided')
        }
        try {
            const user = await this.userDAO.toggleBanUser(userId, toggle)
            return user
        }
        catch (e) {
            throw new InternalServerError('Unable to access users in the DB')
        }
    }
}