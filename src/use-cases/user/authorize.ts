import UnauthorizedError from "../../errors/unauthorizedError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import User from "../../entities/user.js";



export default class AuthorizeUser implements IUseCase<User>{
    constructor(
        private verifyToken: (token: string) => Pick<User, 'id'>,
        private userDAO: IUserDAO
    ){}
    async call(token: string): Promise<User>{
        if(!token){
            throw new UnauthorizedError('Please provide a token to authenticate')
        }
        let { id } = this.verifyToken(token)
        if(!id){
            throw new UnauthorizedError('Invalid or Expired Token')
        }
        let user = await this.userDAO.findById(id)
        if(!user){
            throw new UnauthorizedError('User dosen\'t exist')
        }
        else{
            return user
        }
        
    }
}