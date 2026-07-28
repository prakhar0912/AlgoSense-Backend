import InternalServerError from "../../errors/internalServerError.js";
export default class RemoveUser {
    userDAO;
    constructor(userDAO) {
        this.userDAO = userDAO;
    }
    async call(userId) {
        let success;
        try {
            success = await this.userDAO.delete(userId);
        }
        catch (e) {
            throw new InternalServerError('Unable delete user from DB.', e);
        }
        return success;
    }
}
//# sourceMappingURL=removeUser.js.map