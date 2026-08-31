import type { User } from "../../entities/index.js";
import { InternalServerError, ValidationError } from "../../errors/index.js";
import type { IPaginated, IUseCase, IUserDAO } from "../../interfaces/index.js";



export default class ListUsers implements IUseCase<IPaginated<User>> {
  constructor(
    private userDAO: IUserDAO
  ) { }
  async call(filters: Partial<User>, page: number = 1, perPage: number = 10): Promise<IPaginated<User>> {
    if (page < 1 || perPage < 1 || !Number.isInteger(page) || !Number.isInteger(perPage) || !Number.isFinite(page) || !Number.isFinite(perPage)) {
      throw new ValidationError('Page and perPage must be positive whole integers')
    }
    let usersData: IPaginated<User>
    try {
      usersData = await this.userDAO.findAll(filters, page, perPage)
    }
    catch (e) {
      throw new InternalServerError('Unable to access users in the DB', e)
    }
    return usersData
  }
}
