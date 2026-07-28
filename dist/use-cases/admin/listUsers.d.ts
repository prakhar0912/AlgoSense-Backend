import type User from "../../entities/user.js";
import type IPaginated from "../../interfaces/paginated.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
export default class ListUsers implements IUseCase<IPaginated<User>> {
    private userDAO;
    constructor(userDAO: IUserDAO);
    call(filters: Partial<User>, page?: number, perPage?: number): Promise<IPaginated<User>>;
}
//# sourceMappingURL=listUsers.d.ts.map