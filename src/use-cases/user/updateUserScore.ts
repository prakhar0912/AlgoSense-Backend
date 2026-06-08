import type User from "../../entities/user.js";
import type UserScores from "../../entities/userScores.js";
import InternalServerError from "../../errors/internalServerError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class UpdateUserScore implements IUseCase<Partial<UserScores>> {
    constructor(
        private userDAO: IUserDAO
    ) { }
    async call(userId: string, userScores: UserScores, approachScore: number, problemDifficulty: number, edgeCaseScore: number): Promise<Partial<UserScores>> {
        if (!approachScore) {
            throw new InternalServerError('Approach Score not sent')
        }
        if (!edgeCaseScore) {
            throw new InternalServerError('Approach Score not sent')
        }
        const maxPossibleScore = 10
        let mergedApproachScore = 0
        let mergedEdgeCaseScore = 0
        if (approachScore > 10) {
            approachScore = 10
        }
        if (edgeCaseScore > 10) {
            approachScore = 10
        }
        if (!userScores) {
            mergedApproachScore = ((approachScore * problemDifficulty) / (maxPossibleScore * problemDifficulty)) * 100
            mergedEdgeCaseScore = edgeCaseScore * 100
        }
        else {
            const weightedApproachScore = ((approachScore * problemDifficulty) / (maxPossibleScore * problemDifficulty)) * 100
            mergedApproachScore = (userScores.approaches_score + weightedApproachScore) / 2
            mergedEdgeCaseScore = (userScores.edge_case_score + (edgeCaseScore * 100)) / 2
        }


        let updatedUserScores: UserScores
        try {
            updatedUserScores = await this.userDAO.setUserScores(userId, {
                approaches_score: mergedApproachScore,
                edge_case_score: mergedEdgeCaseScore
            })
        }
        catch (e) {
            throw new InternalServerError('Unable to store new Scores.')
        }

        return updatedUserScores

    }
}