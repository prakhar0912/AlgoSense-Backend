import InternalServerError from "../errors/internalServerError.js";
import ValidationError from "../errors/validationError.js";
export default class AdminController {
    listUsers;
    removeUser;
    toggleBanUser;
    updateUser;
    userFiltersDataTypeValidator;
    updateUserDataTypeValidator;
    constructor(listUsers, removeUser, toggleBanUser, updateUser, userFiltersDataTypeValidator, updateUserDataTypeValidator) {
        this.listUsers = listUsers;
        this.removeUser = removeUser;
        this.toggleBanUser = toggleBanUser;
        this.updateUser = updateUser;
        this.userFiltersDataTypeValidator = userFiltersDataTypeValidator;
        this.updateUserDataTypeValidator = updateUserDataTypeValidator;
    }
    validatePaginationParams(params) {
        const page = params?.page;
        const perPage = params?.perPage;
        if ((page !== undefined && typeof page !== 'number') ||
            (perPage !== undefined && typeof perPage !== 'number')) {
            throw new ValidationError('Params are required to be numbers');
        }
        return { page, perPage };
    }
    //Helper Functions Above
    async listFilteredUsers(request) {
        const { page, perPage } = this.validatePaginationParams(request.params);
        let validationResult;
        try {
            validationResult = this.userFiltersDataTypeValidator.validate(request.body);
        }
        catch (e) {
            throw new InternalServerError('User Filter Data Validation Function Failed', e);
        }
        if (!validationResult.success || validationResult.errors) {
            throw new ValidationError('Invalid User Filter Data', validationResult.errors);
        }
        const filteredUsers = await this.listUsers.call(validationResult.data, page, perPage);
        return filteredUsers;
    }
    async deleteUser(request) {
        let userId = request.params?.id;
        if (!userId || typeof userId !== "string") {
            throw new ValidationError('User Id is required');
        }
        const deletedUser = await this.removeUser.call(userId);
        return deletedUser;
    }
    async toggleBanOnUser(request) {
        const requestBody = request.body;
        if (!requestBody || typeof requestBody !== "object") {
            throw new ValidationError('Body is required');
        }
        const userId = requestBody.id;
        const isBanned = requestBody.isBanned;
        if (typeof userId !== "string") {
            throw new ValidationError('User Id is required');
        }
        if (typeof isBanned !== "boolean") {
            throw new ValidationError('isBanned is required');
        }
        const alteredUser = await this.toggleBanUser.call({ id: userId, isBanned });
        return alteredUser;
    }
    async updateUserById(request) {
        let validationResult;
        try {
            validationResult = this.updateUserDataTypeValidator.validate(request.body);
        }
        catch (e) {
            throw new InternalServerError('Problem Data Validation Function Failed', e);
        }
        if (!validationResult.success || !validationResult.data || validationResult.errors) {
            throw new ValidationError('Invalid User Data', validationResult.errors);
        }
        const userId = request.params?.id;
        if (!userId || typeof userId !== "string") {
            throw new ValidationError('Problem ID is required');
        }
        const updatedUser = await this.updateUser.call(userId, validationResult.data);
        return updatedUser;
    }
}
//# sourceMappingURL=admin.js.map