import type { Approach } from "../../entities/approach.js";
import type Problem from "../../entities/problem.js";
import { ValidationError } from "../../errors/index.js";
import InternalServerError from "../../errors/internalServerError.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IValidator from "../../interfaces/validator.js";


type OptionalWithUndefined<T> = {
  [K in keyof T]?: T[K] | undefined
}
type UpdateProblemPayload = OptionalWithUndefined<
  Omit<Partial<Problem>, "approaches" | "id">
  & {
    approaches?: Partial<OptionalWithUndefined<Approach>[] | []>;
  }>;





export default class UpdateProblem implements IUseCase<Problem> {
  constructor(
    private problemDAO: IProblemDAO,
    private updateProblemValidator: IValidator<OptionalWithUndefined<UpdateProblemPayload>>
  ) { }
  async call(problemId: string, payload: UpdateProblemPayload): Promise<Problem> {
    let validatedProblem

    try {
      validatedProblem = this.updateProblemValidator.validate(payload)
    }
    catch (e) {
      throw new InternalServerError('Problem validator function failed', e)
    }
    if (!validatedProblem.success || !validatedProblem.data || validatedProblem.errors) {
      throw new ValidationError('Problem Data Invalid.', validatedProblem.errors)
    }

    let updatedProblem: Problem
    try {
      updatedProblem = await this.problemDAO.update(problemId, validatedProblem.data as Partial<Problem>)
    }
    catch (e) {
      throw new InternalServerError('Unable to update the problem to the DB', e)
    }
    return updatedProblem
  }
}
