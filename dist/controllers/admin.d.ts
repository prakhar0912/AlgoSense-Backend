import type ShortSubmission from "../entities/shortSubmission.js";
import type User from "../entities/user.js";
import type UserScores from "../entities/userScores.js";
import type IPaginated from "../interfaces/paginated.js";
import type IRequest from "../interfaces/request.js";
import type IUseCase from "../interfaces/useCase.js";
import type IValidator from "../interfaces/validator.js";
type OptionalWithUndefined<T> = {
    [K in keyof T]?: T[K] | undefined;
};
type FilterUserPayload = Omit<Partial<User>, "scores" | "last_5_submissions"> & {
    scores?: OptionalWithUndefined<Partial<UserScores>> | null;
    last_5_submissions?: OptionalWithUndefined<Partial<ShortSubmission>>[] | null;
};
type UpdateUserPayload = Omit<Partial<User>, 'id' | 'created_at' | "scores" | "last_5_submissions"> & {
    scores?: OptionalWithUndefined<Partial<UserScores>> | null;
    last_5_submissions?: OptionalWithUndefined<Partial<ShortSubmission>>[] | null;
};
export default class AdminController {
    protected listUsers: IUseCase<IPaginated<User>>;
    protected removeUser: IUseCase<boolean>;
    protected toggleBanUser: IUseCase<User>;
    protected updateUser: IUseCase<User>;
    protected userFiltersDataTypeValidator: IValidator<OptionalWithUndefined<FilterUserPayload>>;
    protected updateUserDataTypeValidator: IValidator<OptionalWithUndefined<UpdateUserPayload>>;
    constructor(listUsers: IUseCase<IPaginated<User>>, removeUser: IUseCase<boolean>, toggleBanUser: IUseCase<User>, updateUser: IUseCase<User>, userFiltersDataTypeValidator: IValidator<OptionalWithUndefined<FilterUserPayload>>, updateUserDataTypeValidator: IValidator<OptionalWithUndefined<UpdateUserPayload>>);
    private validatePaginationParams;
    listFilteredUsers(request: IRequest): Promise<IPaginated<User>>;
    deleteUser(request: IRequest): Promise<boolean>;
    toggleBanOnUser(request: IRequest): Promise<User>;
    updateUserById(request: IRequest): Promise<User>;
}
export {};
//# sourceMappingURL=admin.d.ts.map