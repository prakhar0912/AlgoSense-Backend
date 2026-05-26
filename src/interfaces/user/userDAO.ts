import type AuthUser from "../../entities/authUser.js"
import Submission from "../../entities/submission.js"
import User from "../../entities/user.js"
import type UserScores from "../../entities/userScores.js"

export default interface IUserDAO {
    create(userData: Partial<AuthUser>): Promise<User>
    update(payload: Partial<User>): Promise<User>
    delete(userId: string): Promise<boolean>
    findForAuth(email: string): Promise<AuthUser | null>
    findById(userId: string): Promise<User | null>
    findByEmail(email: string): Promise<User | null>
    findAll(): Promise<User[]>
    banUser(userId: string): Promise<User>
    unbanUser(userId: string): Promise<User>
    getUserScores(userId: string): Promise<User['scores']>
    setUserScores(userId: string, scores: UserScores): Promise<User['scores']>
    getUserSubmissions(userId: string): Promise<User['submissions']>
    getLast5Submissions(userId: string): Promise<User['submissions']>
    answer(answerData: Partial<Submission>): Promise<Submission>
    viewProfile(userId: string): Promise<User>
    resetPassword(userId: string, newPassword: string): Promise<boolean>
    verifyEmail(userId: string, setVerifiedTo: string): Promise<boolean>
    toggleEmailNotifications(userId: string, enable: boolean): Promise<boolean>
}