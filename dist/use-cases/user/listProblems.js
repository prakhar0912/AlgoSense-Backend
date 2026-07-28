import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
export default class ListProblems {
    problemDAO;
    constructor(problemDAO) {
        this.problemDAO = problemDAO;
    }
    async call(page = 1, perPage = 10) {
        if (page < 1 || perPage < 1 || !Number.isInteger(page) || !Number.isInteger(perPage) || !Number.isFinite(page) || !Number.isFinite(perPage)) {
            throw new ValidationError('Page and perPage must be positive whole integers');
        }
        let paginatedProblems;
        try {
            paginatedProblems = await this.problemDAO.list({}, page, perPage);
        }
        catch (e) {
            throw new InternalServerError('Error while fetching problems from DB');
        }
        return paginatedProblems;
    }
}
//# sourceMappingURL=listProblems.js.map