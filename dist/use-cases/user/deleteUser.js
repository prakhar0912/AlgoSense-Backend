import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
export default class DeleteUser {
    userDAO;
    constructor(userDAO) {
        this.userDAO = userDAO;
    }
    async call(userId) {
        if (typeof userId !== "string") {
            throw new ValidationError("userId must be a string");
        }
        let deleted;
        try {
            deleted = await this.userDAO.delete(userId);
        }
        catch (e) {
            throw new InternalServerError('Error while deleting user from DB');
        }
        return deleted;
    }
}
//# sourceMappingURL=deleteUser.js.map