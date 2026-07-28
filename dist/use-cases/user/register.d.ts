import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type IValidator from "../../interfaces/validator.js";
import type User from "../../entities/user.js";
type UserCreationPayload = {
    id: string;
    email: string;
    first_name?: string | undefined;
    last_name?: string | undefined;
    created_at: string;
    email_verified: boolean;
    email_notifications_enabled?: boolean | undefined;
};
export default class RegisterUser implements IUseCase<User> {
    private userDAO;
    private validateUserRegistration;
    constructor(userDAO: IUserDAO, validateUserRegistration: IValidator<UserCreationPayload>);
    call(payload: UserCreationPayload): Promise<User>;
}
export {};
//# sourceMappingURL=register.d.ts.map