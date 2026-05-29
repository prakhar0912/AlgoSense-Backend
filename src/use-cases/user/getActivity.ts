import type UserScores from "../../entities/userScores.js";
import InternalServerError from "../../errors/internalServerError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class getUserScores implements IUseCase<UserScores | null> {
    constructor(
        private userDAO: IUserDAO,
    ) { }
    async call(userId: string): Promise<UserScores | null> {
        const userScores = await this.userDAO.getUserScores(userId)
        if (userScores === undefined) {
            throw new InternalServerError('User Scores is undefined')
        }
        return userScores
    }
}