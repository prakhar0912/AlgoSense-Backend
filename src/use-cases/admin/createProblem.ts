import type Problem from "../../entities/problem.js";
import { ValidationError } from "../../errors/index.js";
import InternalServerError from "../../errors/internalServerError.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
import type IUseCase from "../../interfaces/useCase.js";
import type { IValidatorResult } from "../../interfaces/validator.js";
import type IValidator from "../../interfaces/validator.js";

export default class CreateProblem implements IUseCase<Problem> {
    constructor(
        private problemDAO: IProblemDAO,
        private problemValidator: IValidator<Omit<Problem, 'id'>>
    ) { }
    async call(payload: Omit<Problem, 'id'>): Promise<Problem> {
        let validatedProblem: IValidatorResult<Omit<Problem, 'id'>>
        try{
            validatedProblem = this.problemValidator.validate(payload)
        }
        catch(e){
            throw new InternalServerError('Problem Data Validator Function Failed.', e)
        }
        if (!validatedProblem.success || !validatedProblem.data || validatedProblem.errors) {
            throw new ValidationError('Problem Data Invalid.', validatedProblem.errors)
        }

        let problem: Problem
        try{
            problem = await this.problemDAO.create(validatedProblem.data)
        }
        catch(e){
            throw new InternalServerError('Unable to save problem to the DB', e)
        }

        return problem
    }
}