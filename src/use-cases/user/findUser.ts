import UnauthorizedError from "../../errors/unauthorizedError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import User from "../../entities/user.js";
import InternalServerError from "../../errors/internalServerError.js";



export default class FindUserbyId implements IUseCase<User> {
  constructor(
    private userDAO: IUserDAO
  ) { }
  async call(userId: string): Promise<User> {
    if (typeof userId !== "string" || typeof userId === "string" && userId.length === 0) {
      throw new UnauthorizedError('Please provide a UserId to authenticate')
    }
    let user: User | null | undefined
    try {
      user = await this.userDAO.findById(userId)
    }
    catch (e) {
      throw new InternalServerError('Error while fetching user from DB')
    }
    if (!user) {
      throw new UnauthorizedError('User dosen\'t exist')
    }
    else {
      return user
    }

  }
}
