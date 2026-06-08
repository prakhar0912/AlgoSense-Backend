import type UserScores from "../../entities/userScores.js";
import InternalServerError from "../../errors/internalServerError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";

export default class UpdateUserScore implements IUseCase<Partial<UserScores>> {
    constructor(
        private userDAO: IUserDAO
    ) { }
    async call(userId: string, userScores: UserScores, approachScore: number, edgeCaseScore: number): Promise<Partial<UserScores>> {
        if (approachScore === null || typeof approachScore !== "number") {
            throw new InternalServerError('Approach Score not sent')
        }
        if (edgeCaseScore === null || typeof edgeCaseScore !== "number") {
            throw new InternalServerError('Edge Case Score not sent')
        }
        const maxPossibleScore = 10
        let mergedApproachScore = 0
        let mergedEdgeCaseScore = 0
        if (approachScore > 10) {
            approachScore = 10
        }
        if (edgeCaseScore > 10) {
            edgeCaseScore = 10
        }
        if(approachScore < 0){
            approachScore = 0
        }
        if(edgeCaseScore < 0){
            edgeCaseScore = 0
        }


        if (!userScores) {
            mergedApproachScore = ((approachScore) / (maxPossibleScore)) * 100
            mergedEdgeCaseScore = edgeCaseScore * 100
        }
        else {
            const weightedApproachScore = ((approachScore) / (maxPossibleScore)) * 100
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