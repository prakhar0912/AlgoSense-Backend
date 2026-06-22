import type AuthUser from "../../entities/authUser.js"
import Submission from "../../entities/submission.js"
import User from "../../entities/user.js"
import type UserScores from "../../entities/userScores.js"
import type IPaginated from "../paginated.js"

export default interface IUserDAO {
    create(userData: Partial<AuthUser>): Promise<User>
    update(userId: string, payload: Partial<User>): Promise<User>
    updatePassword(userId: string, payload: Partial<AuthUser>): Promise<boolean>
    delete(userId: string): Promise<boolean>
    findForAuth(email: string): Promise<AuthUser | null>
    findById(userId: string): Promise<User | null>
    findByEmail(email: string): Promise<User | null>
    findAll(filters: Partial<User>, page: number, perPage: number): Promise<IPaginated<User>>
    toggleBanUser(userId: string, toggle: boolean): Promise<User>
    unbanUser(userId: string): Promise<User>
    getUserScores(userId: string): Promise<User['scores']>
    setUserScores(userId: string, scores: Partial<UserScores>): Promise<UserScores>
    getUserSubmissions(userId: string): Promise<User['submissions']>
    getLast5Submissions(userId: string): Promise<User['submissions']>
    answer(answerData: Partial<Submission>): Promise<Submission>
    viewProfile(userId: string): Promise<User>
    resetPassword(userId: string, newPassword: string): Promise<boolean>
    verifyEmail(userId: string, setVerifiedTo: string): Promise<boolean>
    toggleEmailNotifications(userId: string, enable: boolean): Promise<boolean>
}