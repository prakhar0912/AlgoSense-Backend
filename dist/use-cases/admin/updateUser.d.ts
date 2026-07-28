import type User from "../../entities/user.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type IValidator from "../../interfaces/validator.js";
export default class UpdateUser implements IUseCase<User> {
    private userDAO;
    private userValidator;
    constructor(userDAO: IUserDAO, userValidator: IValidator<Record<string, never> | Omit<User, 'id' | 'created_at'>>);
    call(userId: string, payload: Partial<User>): Promise<User>;
}
//# sourceMappingURL=updateUser.d.ts.map