import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import User from "../../entities/user.js";
export default class FindUserbyId implements IUseCase<User> {
    private userDAO;
    constructor(userDAO: IUserDAO);
    call(userId: string): Promise<User>;
}
//# sourceMappingURL=findUser.d.ts.map