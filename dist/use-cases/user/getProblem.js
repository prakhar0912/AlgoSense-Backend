import { ValidationError } from "../../errors/index.js";
import InternalServerError from "../../errors/internalServerError.js";
import NotFoundError from "../../errors/notFoundError.js";
export default class GetProblem {
    problemDAO;
    constructor(problemDAO) {
        this.problemDAO = problemDAO;
    }
    async call(problemId) {
        if (typeof problemId !== "string") {
            throw new ValidationError('Problem ID must be a valid string');
        }
        let problem;
        try {
            problem = await this.problemDAO.findById(problemId);
        }
        catch (e) {
            throw new InternalServerError('Unable to fetch problem from DB', e);
        }
        if (!problem) {
            throw new NotFoundError('Problem not found in DB');
        }
        return problem;
    }
}
//# sourceMappingURL=getProblem.js.map