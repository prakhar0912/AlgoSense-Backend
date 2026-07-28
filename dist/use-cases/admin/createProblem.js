import { ValidationError } from "../../errors/index.js";
import InternalServerError from "../../errors/internalServerError.js";
export default class CreateProblem {
    problemDAO;
    problemValidator;
    constructor(problemDAO, problemValidator) {
        this.problemDAO = problemDAO;
        this.problemValidator = problemValidator;
    }
    async call(payload) {
        let validatedProblem;
        try {
            validatedProblem = this.problemValidator.validate(payload);
        }
        catch (e) {
            throw new InternalServerError('Problem Data Validator Function Failed.', e);
        }
        if (!validatedProblem.success || !validatedProblem.data || validatedProblem.errors) {
            throw new ValidationError('Problem Data Invalid', validatedProblem.errors);
        }
        let problem;
        try {
            problem = await this.problemDAO.create(validatedProblem.data);
        }
        catch (e) {
            throw new InternalServerError('Unable to save problem to the DB', e);
        }
        return problem;
    }
}
//# sourceMappingURL=createProblem.js.map