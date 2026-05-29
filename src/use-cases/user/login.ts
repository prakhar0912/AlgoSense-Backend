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
            const { id, first_name, last_name, email, role, scores, created_at, submissions, email_notifications_enabled, email_verified } = user
            return {
                user: { id, first_name, last_name, email, role, scores: scores ? scores : null, created_at, submissions: submissions ? submissions : null, email_notifications_enabled, email_verified },
                token: await this.generateToken(user.id),
            }
        } else {
            throw new UnauthorizedError('Invalid login or password')
        }
    }
}
