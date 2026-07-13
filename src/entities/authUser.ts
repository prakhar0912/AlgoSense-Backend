import User from './user.js'

export default class AuthUser extends User {
  password!: string
  retyped_password?: string
}
