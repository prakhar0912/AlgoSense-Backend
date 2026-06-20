import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class DeleteUser implements IUseCase<boolean> {
    constructor(
        private userDAO: IUserDAO
    ) { }
    async call(userId: string) {
        if (typeof userId !== "string"){
            throw new ValidationError("userId must be a string")
        }
        let deleted: boolean
        try {
            deleted = await this.userDAO.delete(userId)
        }
        catch(e){
            throw new InternalServerError('Error while deleting user from DB')
        }
        return deleted
    }
}