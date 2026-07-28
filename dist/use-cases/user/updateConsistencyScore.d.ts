import type UserScores from "../../entities/userScores.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type User from "../../entities/user.js";
export default class UpdateConsistencyScore implements IUseCase<UserScores> {
    private userDAO;
    private getConsistencyScore;
    constructor(userDAO: IUserDAO, getConsistencyScore: (daysLoggedIn: string[]) => number);
    call(userId: string, userScores: User['scores']): Promise<UserScores>;
}
//# sourceMappingURL=updateConsistencyScore.d.ts.map