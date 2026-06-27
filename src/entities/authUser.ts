import User from './user.js'

export default class AuthUser extends User {
    password!: string
    salt!: string
    retyped_password?: string
}