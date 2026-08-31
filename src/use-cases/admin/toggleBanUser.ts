import type { User } from "../../entities/index.js";
import { InternalServerError, NotFoundError, ValidationError } from "../../errors/index.js";
import type { IUseCase, IUserDAO } from "../../interfaces/index.js";




export default class ToggleBanUser implements IUseCase<User> {
  constructor(
    private userDAO: IUserDAO
  ) { }
  async call(userId: string, toggle: boolean): Promise<User> {
    let user: User | null
    try {
      user = await this.userDAO.findById(userId)
    }
    catch (e) {
      throw new InternalServerError('Unable to access users in the DB', e)
    }
    if (!user) {
      throw new NotFoundError('User not found')
    }
    if (user.role === 'admin') {
      throw new ValidationError('Cannot ban or unban an admin')
    }


    try {
      user = await this.userDAO.toggleBanUser(userId, toggle)
    }
    catch (e) {
      throw new InternalServerError('Unable to access users in the DB', e)
    }

    return user

  }
}
