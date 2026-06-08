import type UserScores from "../../entities/userScores.js";
import InternalServerError from "../../errors/internalServerError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class UpdateConsistencyScore implements IUseCase<Partial<UserScores>> {
    constructor(
        private userDAO: IUserDAO,
        private firstLoginToday: (daysLoggedIn: string[]) => boolean,
        private getConsistencyScore: (daysLoggedIn: string[]) => number
    ) { }
    async call(userId: string, userScores: UserScores): Promise<Partial<UserScores>> {
        let daysLoggedIn = userScores ? userScores.days_logged_in : []
        if (!userScores) {
            daysLoggedIn.push(new Date().toISOString().split('.')[0] + 'Z')
        }
        else {
            let isFirstLoginToday: boolean
            try {
                isFirstLoginToday = this.firstLoginToday(daysLoggedIn)
            }
            catch (e) {
                throw new InternalServerError('Unable to determine if this is user\'s first login')
            }

            if (isFirstLoginToday) {
                daysLoggedIn.push(new Date().toISOString().split('.')[0] + 'Z')
            }
            else {
                return userScores
            }
        }

        let consistencyScore: number;
        try {
            consistencyScore = this.getConsistencyScore(daysLoggedIn)
        }
        catch (e) {
            throw new InternalServerError('Unable to calculate consistency score.')
        }

        let updatedUserScores: UserScores
        try {
            updatedUserScores = await this.userDAO.setUserScores(userId, {
                consistency_score: consistencyScore,
                days_logged_in: daysLoggedIn
            })
        }
        catch (e) {
            throw new InternalServerError('Unable to store new Scores.')
        }
        return updatedUserScores

    }
}