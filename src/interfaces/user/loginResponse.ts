import User from "../../entities/user.js"

export default interface ILoginResponse {
    token: string
    user: Partial<User>
}