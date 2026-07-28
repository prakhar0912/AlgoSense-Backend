import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
export default class DeleteUser implements IUseCase<boolean> {
    private userDAO;
    constructor(userDAO: IUserDAO);
    call(userId: string): Promise<boolean>;
}
//# sourceMappingURL=deleteUser.d.ts.map