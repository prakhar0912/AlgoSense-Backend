import { ValidationError } from "../../errors/index.js";
import InternalServerError from "../../errors/internalServerError.js";
export default class RegisterUser {
    userDAO;
    validateUserRegistration;
    constructor(userDAO, validateUserRegistration) {
        this.userDAO = userDAO;
        this.validateUserRegistration = validateUserRegistration;
    }
    async call(payload) {
        let validationResult;
        try {
            validationResult = this.validateUserRegistration.validate(payload);
        }
        catch (e) {
            throw new InternalServerError('User Input Validation Function Failed');
        }
        if (!validationResult.success || !validationResult.data) {
            throw new ValidationError('Invalid user registration data', validationResult.errors);
        }
        const { id, email, first_name, last_name, created_at, email_verified, email_notifications_enabled } = validationResult.data;
        let existingUser;
        try {
            existingUser = await this.userDAO.findByEmail(email);
        }
        catch (e) {
            throw new InternalServerError('Failed to check if user already exists', e);
        }
        if (existingUser) {
            throw new ValidationError('Email is already in use', [{ field: 'email', message: 'Email is already in use' }]);
        }
        let newUser;
        try {
            newUser = await this.userDAO.create({
                id,
                email,
                first_name: first_name ? first_name : "Johney",
                last_name: last_name ? last_name : "Doey",
                email_notifications_enabled: email_notifications_enabled ? email_notifications_enabled : true,
                role: 'user',
                banned: false,
                created_at,
                email_verified,
            });
        }
        catch (e) {
            throw new InternalServerError('Error in creating user', e);
        }
        return newUser;
    }
}
//# sourceMappingURL=register.js.map