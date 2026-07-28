import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
export default class UpdateUserProfile {
    userDAO;
    validateUserProfile;
    constructor(userDAO, validateUserProfile) {
        this.userDAO = userDAO;
        this.validateUserProfile = validateUserProfile;
    }
    async call(userId, updatedValues) {
        let validationResult;
        try {
            validationResult = this.validateUserProfile.validate(updatedValues);
        }
        catch (e) {
            throw new InternalServerError('User Input Validation Function Failed', e);
        }
        if (!validationResult.success || !validationResult.data || validationResult.errors) {
            throw new ValidationError('Invalid user profile data', validationResult.errors);
        }
        let updatedUserProfile;
        try {
            updatedUserProfile = await this.userDAO.update(userId, validationResult.data);
        }
        catch (e) {
            throw new InternalServerError('Unable to update user profile', e);
        }
        return updatedUserProfile;
    }
}
//# sourceMappingURL=updateUserSettings.js.map