import UnauthorizedError from "../../errors/unauthorizedError.js";
import User from "../../entities/user.js";
import InternalServerError from "../../errors/internalServerError.js";
export default class FindUserbyId {
    userDAO;
    constructor(userDAO) {
        this.userDAO = userDAO;
    }
    async call(userId) {
        if (typeof userId !== "string" || typeof userId === "string" && userId.length === 0) {
            throw new UnauthorizedError('Please provide a UserId to authenticate');
        }
        let user;
        try {
            user = await this.userDAO.findById(userId);
        }
        catch (e) {
            throw new InternalServerError('Error while fetching user from DB');
        }
        if (!user) {
            throw new UnauthorizedError('User dosen\'t exist');
        }
        else {
            return user;
        }
    }
}
//# sourceMappingURL=findUser.js.map