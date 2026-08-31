import type { UserScores, User } from "../../entities/index.js";
import { InternalServerError, UnauthorizedError } from "../../errors/index.js";
import type { IUseCase } from "../../interfaces/index.js";
import services from "../../config/services.js";
import { runInTransaction } from "../../infrastructure/data-access/client.js";
import UserDAO from "../../infrastructure/data-access/userDAO.js";

export default class UpdateConsistencyScore implements IUseCase<UserScores> {
  constructor() { }
  async call(userId: string): Promise<UserScores> {
    const newUserScores: User['scores'] = await runInTransaction(async (client) => {
      const userDAO = new UserDAO(client)
      let user: User | null
      try {
        user = await userDAO.findByIdForUpdate(userId)
      }
      catch (e) {
        throw new InternalServerError('Unable to fetch user from DB.', e)
      }
      if (!user) {
        throw new UnauthorizedError('AlgoSense account not found!')
      }

      if (typeof user.scores === 'undefined') {
        throw new InternalServerError("User data malformed, scores is undefined")
      }
      const daysLoggedIn = user.scores && user.scores.days_logged_in ? user.scores.days_logged_in : []
      if (!user.scores || daysLoggedIn.length === 0) {
        daysLoggedIn.push(new Date().toISOString())
      }
      else {
        const lastLoginStr = daysLoggedIn[daysLoggedIn.length - 1]
        if (!lastLoginStr) {
          throw new InternalServerError("Invalid latest login date: null or undefined");
        }
        const latestLoginDate = new Date(lastLoginStr)
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
          daysLoggedIn.push(new Date().toISOString())
        }
        else {
          return user.scores
        }
      }

      let consistencyScore: number;
      let totalScore: number
      try {
        const newScores = this.calculateNewScores(daysLoggedIn, user.scores)
        consistencyScore = newScores.consistencyScore
        totalScore = newScores.totalScore
      }
      catch (e) {
        throw new InternalServerError('Unable to calculate consistency score.', e)
      }

      let updatedUserScores: UserScores
      try {
        updatedUserScores = await userDAO.setUserScores(userId, {
          consistency_score: consistencyScore,
          days_logged_in: daysLoggedIn,
          total_score: totalScore
        })
      }
      catch (e) {
        throw new InternalServerError('Unable to store new Scores.')
      }
      return updatedUserScores
    })
    if (!newUserScores) {
      throw new InternalServerError("Failed to update the consistency score!")
    }
    return newUserScores
  }

  calculateNewScores(daysLoggedIn: string[], userScores: UserScores): { totalScore: number, consistencyScore: number } {

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const uniqueDays = new Set(
      daysLoggedIn
        .map(date => new Date(date))
        .filter(date => date >= thirtyDaysAgo)
        .map(date => date.toISOString().split("T")[0])
        .sort()
        .reverse()
    )


    let activeDaysRatio = uniqueDays.size / 30;

    let streak = 0;
    let expected = new Date();

    // Normalize to UTC midnight
    expected.setUTCHours(0, 0, 0, 0);

    for (const day of uniqueDays) {
      if (!day) {
        continue
      }
      const current = new Date(day);
      current.setUTCHours(0, 0, 0, 0);

      if (current.getTime() === expected.getTime()) {
        streak++;
        expected.setUTCDate(expected.getUTCDate() - 1);
      } else if (streak === 0) {
        // Allow missing today if last practice was yesterday
        expected.setUTCDate(expected.getUTCDate() - 1);
        if (current.getTime() === expected.getTime()) {
          streak++;
          expected.setUTCDate(expected.getUTCDate() - 1);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    let streakScore = Math.min(Math.log(streak + 1) / Math.log(30), 1);

    let recencyScore = 0
    let lastSession = uniqueDays.values().next().value
    if (lastSession) {
      let daysSinceLatestSession = (today.getTime() - new Date(lastSession).getTime()) / (1000 * 60 * 60 * 24)
      recencyScore = Math.exp(-daysSinceLatestSession / 14)
    }


    const consistencyScore = (
      0.5 * activeDaysRatio +
      0.3 * streakScore +
      0.2 * recencyScore
    ) * 100;

    let totalScore = services.weights.totalScoreWeights.consistency_score * consistencyScore
    if (typeof userScores.edge_case_score === 'number') {
      totalScore += services.weights.totalScoreWeights.edge_case_score * userScores.edge_case_score
    }
    if (typeof userScores.approaches_score === 'number') {
      totalScore += services.weights.totalScoreWeights.approach_score * userScores.approaches_score
    }
    return { consistencyScore, totalScore }
  }
}



