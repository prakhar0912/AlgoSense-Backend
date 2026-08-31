import { InternalServerError, ValidationError } from "../../errors/index.js";
import type { IUseCase, IUserDAO } from "../../interfaces/index.js";

export default class DeleteUser implements IUseCase<boolean> {
  constructor(
    private userDAO: IUserDAO
  ) { }
  async call(userId: string) {
    if (typeof userId !== "string") {
      throw new ValidationError("userId must be a string")
    }
    let deleted: boolean
    try {
      deleted = await this.userDAO.delete(userId)
    }
    catch (e) {
      throw new InternalServerError('Error while deleting user from DB')
    }
    return deleted
  }
}
