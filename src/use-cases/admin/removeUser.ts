import InternalServerError from "../../errors/internalServerError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class RemoveUser implements IUseCase<boolean>{
    constructor(
        private userDAO: IUserDAO
    ){}
    async call(userId: string): Promise<boolean>{
        let success: boolean
        try{
            success = await this.userDAO.delete(userId)
        }
        catch(e){
            throw new InternalServerError('Unable delete user from DB.', e)
        }
        return success
    }
}