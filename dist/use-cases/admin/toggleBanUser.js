import InternalServerError from "../../errors/internalServerError.js";
import NotFoundError from "../../errors/notFoundError.js";
import ValidationError from "../../errors/validationError.js";
export default class ToggleBanUser {
    userDAO;
    constructor(userDAO) {
        this.userDAO = userDAO;
    }
    async call(userId, toggle) {
        let user;
        try {
            user = await this.userDAO.findById(userId);
        }
        catch (e) {
            throw new InternalServerError('Unable to access users in the DB', e);
        }
        if (!user) {
            throw new NotFoundError('User not found');
        }
        if (user.role === 'admin') {
            throw new ValidationError('Cannot ban or unban an admin');
        }
        try {
            user = await this.userDAO.toggleBanUser(userId, toggle);
        }
        catch (e) {
            throw new InternalServerError('Unable to access users in the DB', e);
        }
        return user;
    }
}
//# sourceMappingURL=toggleBanUser.js.map