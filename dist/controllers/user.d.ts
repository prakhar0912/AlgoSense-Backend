import type Submission from "../entities/submission.js";
import type User from "../entities/user.js";
import type UserScores from "../entities/userScores.js";
import type IRequest from "../interfaces/request.js";
import type IValidator from "../interfaces/validator.js";
import type FindUserbyId from "../use-cases/user/findUser.js";
import type DeleteUser from "../use-cases/user/deleteUser.js";
import type SubmitSolution from "../use-cases/user/submitSolution.js";
import type UpdateConsistencyScore from "../use-cases/user/updateConsistencyScore.js";
import type UpdateUserScore from "../use-cases/user/updateUserScore.js";
import type UpdateUserProfile from "../use-cases/user/updateUserSettings.js";
import type RegisterUser from "../use-cases/user/register.js";
import type GetSubmissionsById from "../use-cases/user/getSubmissionsById.js";
type OptionalWithUndefined<T> = {
    [K in keyof T]?: T[K] | undefined;
};
type UserSettingsValues = OptionalWithUndefined<Partial<Pick<User, 'first_name' | 'last_name' | 'email_notifications_enabled'>>>;
export default class UserController {
    protected findUserbyId: FindUserbyId;
    protected deleteSelf: DeleteUser;
    protected submitSolution: SubmitSolution;
    protected updateConsistencyScore: UpdateConsistencyScore;
    protected updateUserScore: UpdateUserScore;
    protected updateUserSettings: UpdateUserProfile;
    protected createUser: RegisterUser;
    protected getSubmissionsById: GetSubmissionsById;
    protected profileDataValidator: IValidator<UserSettingsValues | null | undefined>;
    constructor(findUserbyId: FindUserbyId, deleteSelf: DeleteUser, submitSolution: SubmitSolution, updateConsistencyScore: UpdateConsistencyScore, updateUserScore: UpdateUserScore, updateUserSettings: UpdateUserProfile, createUser: RegisterUser, getSubmissionsById: GetSubmissionsById, profileDataValidator: IValidator<UserSettingsValues | null | undefined>);
    private validatePaginationParams;
    getUserSubmissions(request: IRequest): Promise<import("../interfaces/paginated.js").default<Submission>>;
    newUserRegistration(request: IRequest): Promise<User | null>;
    deleteSelfUser(request: IRequest): Promise<boolean>;
    getProfile(request: IRequest): Promise<User>;
    submitAnswer(request: IRequest): Promise<{
        result: Submission;
        prevScores: UserScores | null | undefined;
        newScores: UserScores;
    }>;
    updateConsistencyScores(request: IRequest): Promise<UserScores>;
    updateSelfProfile(request: IRequest): Promise<User>;
}
export {};
//# sourceMappingURL=user.d.ts.map