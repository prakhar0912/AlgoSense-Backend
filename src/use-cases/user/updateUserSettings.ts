import type User from "../../entities/user.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class UpdateUserProfile implements IUseCase<Partial<User>>{
    constructor(
        private userDAO: IUserDAO
    ){}
    async call(userId: string, updatedValues: Pick<User, 'email' | 'first_name' | 'last_name' | 'email_verified' | 'email_notifications_enabled'>){
        return await this.userDAO.update(userId, updatedValues)
    }
}