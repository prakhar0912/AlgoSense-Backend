import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
export default class RemoveUser implements IUseCase<boolean> {
    private userDAO;
    constructor(userDAO: IUserDAO);
    call(userId: string): Promise<boolean>;
}
//# sourceMappingURL=removeUser.d.ts.map