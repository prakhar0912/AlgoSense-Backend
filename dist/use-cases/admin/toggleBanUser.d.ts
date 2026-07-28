import type User from "../../entities/user.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
export default class ToggleBanUser implements IUseCase<User> {
    private userDAO;
    constructor(userDAO: IUserDAO);
    call(userId: string, toggle: boolean): Promise<User>;
}
//# sourceMappingURL=toggleBanUser.d.ts.map