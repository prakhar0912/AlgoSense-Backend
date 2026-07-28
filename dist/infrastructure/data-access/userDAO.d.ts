import type { PoolClient } from 'pg';
import ShortSubmission from '../../entities/shortSubmission.js';
import User from '../../entities/user.js';
import UserScores from '../../entities/userScores.js';
import type IPaginated from '../../interfaces/paginated.js';
import type IUserDAO from '../../interfaces/user/userDAO.js';
type DbClient = Pick<PoolClient, 'query'>;
export default class UserDAO implements IUserDAO {
    private readonly db;
    constructor(db?: DbClient);
    create(userData: User): Promise<User>;
    update(userId: string, payload: Partial<User>): Promise<User>;
    updateSelfProfile(userId: string, payload: Partial<User>): Promise<User>;
    delete(userId: string): Promise<boolean>;
    findById(userId: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findAll(filters: Partial<User>, page: number, perPage: number): Promise<IPaginated<User>>;
    toggleBanUser(userId: string, toggle: boolean): Promise<User>;
    unbanUser(userId: string): Promise<User>;
    getUserScores(userId: string): Promise<UserScores | null>;
    setUserScores(userId: string, scores: Partial<UserScores>): Promise<UserScores>;
    getUserSubmissions(userId: string): Promise<ShortSubmission[] | null>;
    getLast5Submissions(userId: string): Promise<ShortSubmission[] | null>;
    setSubmissionsInProfile(userId: string, payload: Partial<ShortSubmission[]>): Promise<ShortSubmission[]>;
    viewProfile(userId: string): Promise<User | null>;
    toggleEmailNotifications(userId: string, enable: boolean): Promise<boolean>;
    updateUser(userId: string, payload: Partial<User>): Promise<User>;
    private findUserByColumn;
    private updateBooleanField;
    private buildFilterClause;
    private updateUserRow;
    private mapUserRow;
}
export {};
//# sourceMappingURL=userDAO.d.ts.map