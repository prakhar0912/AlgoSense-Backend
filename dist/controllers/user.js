import InternalServerError from "../errors/internalServerError.js";
import ValidationError from "../errors/validationError.js";
export default class UserController {
    findUserbyId;
    deleteSelf;
    submitSolution;
    updateConsistencyScore;
    updateUserScore;
    updateUserSettings;
    createUser;
    getSubmissionsById;
    profileDataValidator;
    constructor(findUserbyId, deleteSelf, submitSolution, updateConsistencyScore, updateUserScore, updateUserSettings, createUser, getSubmissionsById, 
    // Validators
    profileDataValidator) {
        this.findUserbyId = findUserbyId;
        this.deleteSelf = deleteSelf;
        this.submitSolution = submitSolution;
        this.updateConsistencyScore = updateConsistencyScore;
        this.updateUserScore = updateUserScore;
        this.updateUserSettings = updateUserSettings;
        this.createUser = createUser;
        this.getSubmissionsById = getSubmissionsById;
        this.profileDataValidator = profileDataValidator;
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
    //Helper Functions above
    async getUserSubmissions(request) {
        if (!request.userId) {
            throw new ValidationError("userId not present");
        }
        return await this.getSubmissionsById.call(request.userId);
    }
    async newUserRegistration(request) {
        if (!request.body || typeof request.body !== "object") {
            throw new ValidationError('Request body is required');
        }
        const body = request.body;
        if (!body.id || typeof body.id !== "string") {
            throw new ValidationError('User ID is not valid');
        }
        if (!body.email || typeof body.email !== "string") {
            throw new ValidationError('email should be a string');
        }
        if (body.first_name && typeof body.first_name !== "string") {
            throw new ValidationError('first_name should be a string');
        }
        if (body.last_name && typeof body.last_name !== "string") {
            throw new ValidationError('last_name should be a string');
        }
        if (!body.created_at || typeof body.created_at !== "string") {
            throw new ValidationError('created_at should be a string');
        }
        if (!body.email_verified || typeof body.email_verified !== "boolean") {
            throw new ValidationError('email_verified should be a boolean');
        }
        if (body.email_notifications_enabled && typeof body.email_notifications_enabled !== "boolean") {
            throw new ValidationError('email_notifications_enabled should be a boolean');
        }
        return await this.createUser.call(request.body);
    }
    async deleteSelfUser(request) {
        if (!request.userId) {
            throw new ValidationError("userId not present");
        }
        return await this.deleteSelf.call(request.userId);
    }
    async getProfile(request) {
        if (!request.userId) {
            throw new ValidationError("userId not present");
        }
        return await this.findUserbyId.call(request.userId);
    }
    async submitAnswer(request) {
        if (!request.userId) {
            throw new ValidationError("userId not present");
        }
        const user = await this.findUserbyId.call(request.userId);
        if (user.scores === undefined) {
            throw new InternalServerError("User Data malformed, please reach out to an admin");
        }
        if (!request.body || typeof request.body !== "object") {
            throw new ValidationError('Request body is required');
        }
        const body = request.body;
        if (!body.problem_id || typeof body.problem_id !== "string") {
            throw new ValidationError('Problem ID is not valid');
        }
        if (!body.userInput || typeof body.userInput !== "string") {
            throw new ValidationError('Answer isn\'t of valid type: string');
        }
        const result = await this.submitSolution.call(user.id, user.scores, user.last_5_submissions, body.problem_id, body.userInput);
        if (!result) {
            throw new InternalServerError("Didn't get good response from solution submitter");
        }
        if (typeof result.approach_score !== "number" || typeof result.edge_case_score !== "number") {
            throw new InternalServerError("Recieved malformed data from model response");
        }
        const newUser = await this.findUserbyId.call(user.id);
        if (!newUser || !newUser.scores) {
            throw new InternalServerError("Didn't get good response from solution submitter");
        }
        return {
            result,
            prevScores: user.scores,
            newScores: newUser.scores
        };
    }
    async updateConsistencyScores(request) {
        if (!request.userId) {
            throw new ValidationError("userId not present");
        }
        const user = await this.findUserbyId.call(request.userId);
        return await this.updateConsistencyScore.call(user.id, user.scores);
    }
    async updateSelfProfile(request) {
        if (!request.userId) {
            throw new ValidationError("userId not present");
        }
        let validationResult;
        try {
            validationResult = this.profileDataValidator.validate(request.body);
        }
        catch (e) {
            throw new InternalServerError('User Input Validation Function Failed', e);
        }
        if (!validationResult.success || !validationResult.data || validationResult.errors) {
            throw new ValidationError('Invalid user profile data', validationResult.errors);
        }
        return await this.updateUserSettings.call(request.userId, validationResult.data);
    }
}
//# sourceMappingURL=user.js.map