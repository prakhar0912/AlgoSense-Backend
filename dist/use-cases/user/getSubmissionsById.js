import UnauthorizedError from "../../errors/unauthorizedError.js";
import InternalServerError from "../../errors/internalServerError.js";
export default class GetSubmissionsById {
    submissionDAO;
    constructor(submissionDAO) {
        this.submissionDAO = submissionDAO;
    }
    async call(userId) {
        if (typeof userId !== "string" || typeof userId === "string" && userId.length === 0) {
            throw new UnauthorizedError('Please provide a UserId to authenticate');
        }
        let submissions;
        try {
            submissions = await this.submissionDAO.viewByUser(userId);
        }
        catch (e) {
            throw new InternalServerError('Error while fetching user from DB');
        }
        return submissions;
    }
}
//# sourceMappingURL=getSubmissionsById.js.map