import type UserScores from "../../entities/userScores.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
export default class UpdateUserScore implements IUseCase<Partial<UserScores>> {
    private userDAO;
    constructor(userDAO: IUserDAO);
    call(userId: string, userScores: UserScores | null | undefined, approachScore: number, edgeCaseScore: number): Promise<UserScores>;
}
//# sourceMappingURL=updateUserScore.d.ts.map