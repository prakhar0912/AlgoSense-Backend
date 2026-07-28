import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
export default class UpdateUser {
    userDAO;
    userValidator;
    constructor(userDAO, userValidator) {
        this.userDAO = userDAO;
        this.userValidator = userValidator;
    }
    async call(userId, payload) {
        let validatedUpdatedUser;
        try {
            validatedUpdatedUser = this.userValidator.validate(payload);
        }
        catch (e) {
            throw new InternalServerError('User data validator function failed', e);
        }
        if (!validatedUpdatedUser.success || !validatedUpdatedUser.data || validatedUpdatedUser.errors) {
            throw new ValidationError('Problem Data Invalid.', validatedUpdatedUser.errors);
        }
        let updatedUser;
        try {
            updatedUser = await this.userDAO.updateSelfProfile(userId, validatedUpdatedUser.data);
        }
        catch (e) {
            throw new InternalServerError('Unable to update the problem to the DB', e);
        }
        return updatedUser;
    }
}
//# sourceMappingURL=updateUser.js.map