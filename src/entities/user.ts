import Submission from "./submission.js"
import UserScores from "./userScores.js"

export default class User {
    id!: string
    email!: string
    firstName!: string
    lastName!: string
    role!: 'admin' | 'user'
    banned!: boolean
    scores?: UserScores | null
    createdAt!: Date
    submissions?: Submission[] | []
    emailVerified!: boolean
    emailNotificationsEnabled!: boolean
}