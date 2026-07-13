import Submission from "./submission.js"
import UserScores from "./userScores.js"

export default class User {
  id!: string
  email!: string
  first_name?: string | null
  last_name?: string | null
  role!: 'admin' | 'user'
  banned!: boolean
  scores?: UserScores | null
  created_at!: string
  submissions?: Submission[] | null
  email_verified!: boolean
  email_notifications_enabled!: boolean
}
