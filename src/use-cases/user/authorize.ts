import UnauthorizedError from "../../errors/unauthorizedError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import User from "../../entities/user.js";
import InternalServerError from "../../errors/internalServerError.js";



export default class AuthorizeUser implements IUseCase<User> {
    constructor(
        private extractTokenValue: (token: string) => string | null,
        private userDAO: IUserDAO
    ) { }
    async call(token: string): Promise<User> {
        if (typeof token !== "string" || typeof token === "string" && token.length === 0) {
            throw new UnauthorizedError('Please provide a token to authenticate')
        }
        let id: string | null | undefined
        try {
            id = this.extractTokenValue(token)
        }
        catch (e) {
            throw new InternalServerError('Error while extracting Token value')
        }
        if (!id) {
            throw new UnauthorizedError('Invalid or Expired Token')
        }
        let user: User | null | undefined
        try {
            user = await this.userDAO.findById(id)
        }
        catch (e) {
            throw new InternalServerError('Error while fetching user from DB')
        }
        if (!user) {
            throw new UnauthorizedError('User dosen\'t exist')
        }
        else {
            return user
        }

    }
}