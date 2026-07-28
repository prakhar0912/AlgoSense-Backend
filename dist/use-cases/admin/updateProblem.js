import { ValidationError } from "../../errors/index.js";
import InternalServerError from "../../errors/internalServerError.js";
export default class UpdateProblem {
    problemDAO;
    updateProblemValidator;
    constructor(problemDAO, updateProblemValidator) {
        this.problemDAO = problemDAO;
        this.updateProblemValidator = updateProblemValidator;
    }
    async call(problemId, payload) {
        let validatedProblem;
        try {
            validatedProblem = this.updateProblemValidator.validate(payload);
        }
        catch (e) {
            throw new InternalServerError('Problem validator function failed', e);
        }
        if (!validatedProblem.success || !validatedProblem.data || validatedProblem.errors) {
            throw new ValidationError('Problem Data Invalid.', validatedProblem.errors);
        }
        let updatedProblem;
        try {
            updatedProblem = await this.problemDAO.update(problemId, validatedProblem.data);
        }
        catch (e) {
            throw new InternalServerError('Unable to update the problem to the DB', e);
        }
        return updatedProblem;
    }
}
//# sourceMappingURL=updateProblem.js.map