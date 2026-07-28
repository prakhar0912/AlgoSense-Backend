import InternalServerError from "../../errors/internalServerError.js";
export default class UpdateUserScore {
    userDAO;
    constructor(userDAO) {
        this.userDAO = userDAO;
    }
    async call(userId, userScores, approachScore, edgeCaseScore) {
        if (approachScore === null || typeof approachScore !== "number") {
            throw new InternalServerError('Approach Score not sent');
        }
        if (edgeCaseScore === null || typeof edgeCaseScore !== "number") {
            throw new InternalServerError('Edge Case Score not sent');
        }
        const maxPossibleScore = 100;
        let mergedApproachScore = 0;
        let mergedEdgeCaseScore = 0;
        if (approachScore > 100) {
            approachScore = 10;
        }
        if (edgeCaseScore > 100) {
            edgeCaseScore = 10;
        }
        if (approachScore < 0) {
            approachScore = 0;
        }
        if (edgeCaseScore < 0) {
            edgeCaseScore = 0;
        }
        if (!userScores) {
            mergedApproachScore = ((approachScore) / (maxPossibleScore)) * 100;
            mergedEdgeCaseScore = edgeCaseScore;
        }
        else {
            const weightedApproachScore = ((approachScore) / (maxPossibleScore)) * 100;
            mergedApproachScore = (userScores.approaches_score + weightedApproachScore) / 2;
            mergedEdgeCaseScore = (userScores.edge_case_score + (edgeCaseScore)) / 2;
        }
        let updatedUserScores;
        try {
            updatedUserScores = await this.userDAO.setUserScores(userId, {
                approaches_score: mergedApproachScore,
                edge_case_score: mergedEdgeCaseScore
            });
        }
        catch (e) {
            throw new InternalServerError('Unable to store new Scores.');
        }
        return updatedUserScores;
    }
}
//# sourceMappingURL=updateUserScore.js.map