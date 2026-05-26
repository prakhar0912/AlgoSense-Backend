import type AuthUser from "../../entities/authUser.js";
import { UnauthorizedError, ValidationError } from "../../errors/index.js";
import type IUseCase from "../../interfaces/useCase.js";
import type ILoginResponse from "../../interfaces/user/loginResponse.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class Login implements IUseCase<ILoginResponse> {
    constructor(
        private userDAO: IUserDAO,
        private compareWithHashedPassword: (password: string, hashedPassword: string) => Promise<boolean>,
        private generateToken: (userId: string) => Promise<string>
    ) { }
    async call(email: string, password: string): Promise<ILoginResponse> {
        if (!email || !password) {
            throw new ValidationError('Email and Password are required')
        }
        const user = await this.userDAO.findForAuth(email)
        const passwordsMatch = user ? await this.compareWithHashedPassword(password, user.password) : false

        if (user && passwordsMatch) {
            const { id, firstName, lastName, email, role } = user
            return {
                user: { id, firstName, lastName, email, role },
                token: await this.generateToken(user.id),
            }
        } else {
            throw new UnauthorizedError('Invalid login or password')
        }
    }
}
