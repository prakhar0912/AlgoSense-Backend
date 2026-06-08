import type AuthUser from "../../entities/authUser.js";
import { UnauthorizedError, ValidationError } from "../../errors/index.js";
import InternalServerError from "../../errors/internalServerError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type ILoginResponse from "../../interfaces/user/loginResponse.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class Login implements IUseCase<ILoginResponse> {
    constructor(
        private userDAO: IUserDAO,
        private compareWithHashedPassword: (password: string, hashedPassword: string) => Promise<boolean>,
        private generateToken: (userId: string) => string
    ) { }
    async call(email: string, password: string): Promise<ILoginResponse> {
        if (!email || !password) {
            throw new ValidationError('Email and Password are required')
        }
        let user: AuthUser | null | undefined
        try {
            user = await this.userDAO.findForAuth(email)
        }
        catch (e) {
            throw new InternalServerError('Internal Error in finding user from DB')
        }
        if(!user){
            throw new UnauthorizedError('Invalid Credentials')
        }


        let passwordsMatch: boolean
        try {
            passwordsMatch = await this.compareWithHashedPassword(password, user.password)
        }
        catch(e){
            throw new InternalServerError('Error in comparing passwords')
        }
        
        if (user && passwordsMatch) {
            let token: string
            try {
                token = this.generateToken(user.id)
            }
            catch (e) {
                throw new InternalServerError('Error in extracting token, from DB userId')
            }



            const { id, first_name, last_name, email, role, scores, created_at, submissions, email_notifications_enabled, email_verified } = user
            return {
                user: { id, first_name, last_name, email, role, scores: scores ? scores : null, created_at, submissions: submissions ? submissions : null, email_notifications_enabled, email_verified },
                token: token,
            }
        } else {
            throw new UnauthorizedError('Invalid login or password')
        }
    }
}
