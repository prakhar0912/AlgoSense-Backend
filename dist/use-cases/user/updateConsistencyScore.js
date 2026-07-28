import InternalServerError from "../../errors/internalServerError.js";
export default class UpdateConsistencyScore {
    userDAO;
    getConsistencyScore;
    constructor(userDAO, getConsistencyScore) {
        this.userDAO = userDAO;
        this.getConsistencyScore = getConsistencyScore;
    }
    async call(userId, userScores) {
        //TODO: Implement this use case on almost every route
        const daysLoggedIn = userScores && userScores.days_logged_in ? userScores.days_logged_in : [];
        if (!userScores || daysLoggedIn.length === 0) {
            daysLoggedIn.push(new Date().toISOString());
        }
        else {
            const lastLoginStr = daysLoggedIn[daysLoggedIn.length - 1];
            if (!lastLoginStr) {
                throw new InternalServerError("Invalid latest login date: null or undefined");
            }
            const latestLoginDate = new Date(lastLoginStr);
            if (isNaN(latestLoginDate.getTime())) {
                throw new InternalServerError("Invalid Login data, latest date: " + latestLoginDate);
            }
            const Midnight = new Date();
            Midnight.setHours(0, 0, 0, 0);
            // 3. Get the input date at midnight (00:00:00) to ignore time differences
            const latestMidnight = new Date(latestLoginDate);
            latestMidnight.setHours(0, 0, 0, 0);
            // 4. Compare timestamps
            let isFirstLoginToday = latestMidnight.getTime() < Midnight.getTime();
            if (isFirstLoginToday) {
                daysLoggedIn.push(new Date().toISOString());
            }
            else {
                return userScores;
            }
        }
        let consistencyScore;
        try {
            consistencyScore = this.getConsistencyScore(daysLoggedIn);
        }
        catch (e) {
            throw new InternalServerError('Unable to calculate consistency score.', e);
        }
        let updatedUserScores;
        try {
            updatedUserScores = await this.userDAO.setUserScores(userId, {
                consistency_score: consistencyScore,
                days_logged_in: daysLoggedIn
            });
        }
        catch (e) {
            throw new InternalServerError('Unable to store new Scores.');
        }
        return updatedUserScores;
    }
}
//# sourceMappingURL=updateConsistencyScore.js.map