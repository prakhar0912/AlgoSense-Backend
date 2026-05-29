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
        const id = this.verifyToken(token)
        if (!id) {
            throw new UnauthorizedError('Invalid or Expired Token')
        }
        try {
            const user = await this.userDAO.findById(id)
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
        catch (e) {
            throw new InternalServerError('Unable to access DB for user')
        }
    }
}