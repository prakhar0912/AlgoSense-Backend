import type ShortSubmission from "../../entities/shortSubmission.js";
import User from "../../entities/user.js";
import type UserScores from "../../entities/userScores.js";
import type IPaginated from "../paginated.js";
export default interface IUserDAO {
    create(userData: User): Promise<User>;
    update(userId: string, payload: Partial<User>): Promise<User>;
    updateSelfProfile(userId: string, payload: Partial<User>): Promise<User>;
    delete(userId: string): Promise<boolean>;
    findById(userId: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findAll(filters: Partial<User>, page: number, perPage: number): Promise<IPaginated<User>>;
    toggleBanUser(userId: string, toggle: boolean): Promise<User>;
    unbanUser(userId: string): Promise<User>;
    getUserScores(userId: string): Promise<User['scores'] | null>;
    setUserScores(userId: string, scores: Partial<UserScores>): Promise<UserScores>;
    viewProfile(userId: string): Promise<User | null>;
    toggleEmailNotifications(userId: string, enable: boolean): Promise<boolean>;
    updateUser(userId: string, payload: Partial<User>): Promise<User>;
    setSubmissionsInProfile(userId: string, payload: Partial<ShortSubmission[]>): Promise<ShortSubmission[]>;
}
//# sourceMappingURL=userDAO.d.ts.map