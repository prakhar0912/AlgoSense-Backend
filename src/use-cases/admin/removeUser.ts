import { InternalServerError } from "../../errors/index.js";
import type { IUseCase, IUserDAO } from "../../interfaces/index.js";




export default class RemoveUser implements IUseCase<boolean> {
  constructor(
    private userDAO: IUserDAO
  ) { }
  async call(userId: string): Promise<boolean> {
    let success: boolean
    try {
      success = await this.userDAO.delete(userId)
    }
    catch (e) {
      throw new InternalServerError('Unable delete user from DB.', e)
    }
    return success
  }
}
