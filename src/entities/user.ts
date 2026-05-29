import Submission from "./submission.js"
import UserScores from "./userScores.js"

export default class User {
    id!: string
    email!: string
    first_name!: string
    last_name!: string
    role!: 'admin' | 'user'
    banned!: boolean
    scores?: UserScores | null
    created_at!: Date
    submissions?: Submission[] | null
    email_verified!: boolean
    email_notifications_enabled!: boolean
}