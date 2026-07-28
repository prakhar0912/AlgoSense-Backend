import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
export default class ListUsers {
    userDAO;
    constructor(userDAO) {
        this.userDAO = userDAO;
    }
    async call(filters, page = 1, perPage = 10) {
        if (page < 1 || perPage < 1 || !Number.isInteger(page) || !Number.isInteger(perPage) || !Number.isFinite(page) || !Number.isFinite(perPage)) {
            throw new ValidationError('Page and perPage must be positive whole integers');
        }
        let usersData;
        try {
            usersData = await this.userDAO.findAll(filters, page, perPage);
        }
        catch (e) {
            throw new InternalServerError('Unable to access users in the DB', e);
        }
        return usersData;
    }
}
//# sourceMappingURL=listUsers.js.map