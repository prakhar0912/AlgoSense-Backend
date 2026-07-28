import InternalServerError from "../../errors/internalServerError.js";
export default class DeleteProblem {
    problemDAO;
    constructor(problemDAO) {
        this.problemDAO = problemDAO;
    }
    async call(problemId) {
        let success;
        try {
            success = await this.problemDAO.delete(problemId);
        }
        catch (e) {
            throw new InternalServerError('Unable to delete the problem in the DB', e);
        }
        return success;
    }
}
//# sourceMappingURL=deleteProblem.js.map