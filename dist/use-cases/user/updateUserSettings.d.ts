import type User from "../../entities/user.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type IValidator from "../../interfaces/validator.js";
type OptionalWithUndefined<T> = {
    [K in keyof T]?: T[K] | undefined;
};
type UserSettingsValues = OptionalWithUndefined<Partial<Pick<User, 'first_name' | 'last_name' | 'email_notifications_enabled'>>>;
export default class UpdateUserProfile implements IUseCase<User> {
    private userDAO;
    private validateUserProfile;
    constructor(userDAO: IUserDAO, validateUserProfile: IValidator<UserSettingsValues>);
    call(userId: string, updatedValues: UserSettingsValues): Promise<User>;
}
export {};
//# sourceMappingURL=updateUserSettings.d.ts.map