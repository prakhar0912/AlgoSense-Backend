import type User from "../../entities/user.js";
import InternalServerError from "../../errors/internalServerError.js";
import UnauthorizedError from "../../errors/unauthorizedError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class AuthorizeAdmin implements IUseCase<User> {
    constructor(
        private userDAO: IUserDAO,
        private verifyToken: (token: string) => string | null
    ) { }
    async call(token: string): Promise<User> {
        if (!token) {
            throw new UnauthorizedError('You`re not authorized')
        }
        let id: string | null
        try {
            id = this.verifyToken(token)
        }
        catch (e) {
            throw new InternalServerError('Token Verification Failed')
        }
        if (!id) {
            throw new UnauthorizedError('Invalid or Expired Token')
        }
        

        let user: User | null | undefined
        try {
            user = await this.userDAO.findById(id)
        }
        catch (e) {
            throw new InternalServerError('Unable to access DB for user')
        }
        if (!user) {
            throw new UnauthorizedError('User doesn\'t exist')
        }

        if (user.role !== 'admin') {
            throw new UnauthorizedError('User isn\'t an admin')
        }
        else if (user.role === 'admin') {
            return user
        }
        else {
            throw new UnauthorizedError('User isn\'t an admin')
        }
    }
}