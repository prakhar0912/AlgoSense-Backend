import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class DeleteUser implements IUseCase<boolean>{
    constructor(
        private userDAO: IUserDAO
    ){}
    async call(userId: string){
        const deleted = await this.userDAO.delete(userId)
        return deleted
    }
}