import type AuthUser from "../../entities/authUser.js";
import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type IValidator from "../../interfaces/validator.js";

export default class UpdatePassword implements IUseCase<boolean> {
    constructor(
        private userDAO: IUserDAO,
        private hashPassword: (password: string) => Promise<{ salt: string; hashedPassword: string }>,
        private validateUpdatePassword: IValidator<AuthUser>
    ) { }
    async call(userId: string, newPassword: string, retypedNewPassword: string) {
        if (newPassword !== retypedNewPassword) {
            throw new ValidationError('Password and Retyped Password don\'t match')
        }

        const validationResult = this.validateUpdatePassword.validate({password: newPassword, retypedPassword: retypedNewPassword})
        if (!validationResult.success || !validationResult.data) {
            throw new ValidationError('Invalid Password. Try again with a new one.', validationResult.errors)
        }

        const { salt, hashedPassword } = await this.hashPassword(validationResult.data.password)
        try {
            const success = await this.userDAO.updatePassword(userId, {
                salt,
                password: hashedPassword,
            })
            return success
        }
        catch (e) {
            throw new InternalServerError('Failed to update password in DB, please use old password or try again.')
        }
    }
}