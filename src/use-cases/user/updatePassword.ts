import type AuthUser from "../../entities/authUser.js";
import InternalServerError from "../../errors/internalServerError.js";
import ValidationError from "../../errors/validationError.js";
import type IUseCase from "../../interfaces/useCase.js";
import type IUserDAO from "../../interfaces/user/userDAO.js";
import type { IValidatorResult } from "../../interfaces/validator.js";
import type IValidator from "../../interfaces/validator.js";

export default class UpdatePassword implements IUseCase<boolean> {
    constructor(
        private userDAO: IUserDAO,
        private hashPassword: (password: string) => Promise<{ salt: string; hashedPassword: string }>,
        private validateUpdatePassword: IValidator<{ password: string, retypedPassword: string }>
    ) { }
    async call(userId: string, newPassword: string, retypedNewPassword: string) {
        if (newPassword !== retypedNewPassword) {
            throw new ValidationError('Password and Retyped Password don\'t match')
        }

        let validationResult: IValidatorResult<{ password: string, retypedPassword: string }>
        try {
            validationResult = this.validateUpdatePassword.validate({ password: newPassword, retypedPassword: retypedNewPassword })
        }
        catch (e) {
            throw new ValidationError('Password validator function failed')
        }

        if (!validationResult.success || !validationResult.data || validationResult.errors) {
            throw new ValidationError('Invalid Password. Try again with a new one.', validationResult.errors)
        }

        let hashedNewPassword: { salt: string, hashedPassword: string }
        try {
            hashedNewPassword = await this.hashPassword(validationResult.data.password)
        }
        catch (e) {
            throw new InternalServerError('Failed to hash password, please try again.')
        }

        let success: boolean
        try {
            success = await this.userDAO.updatePassword(userId, {
                salt: hashedNewPassword.salt,
                password: hashedNewPassword.hashedPassword,
            })
        }
        catch (e) {
            throw new InternalServerError('Failed to update password in DB, please use old password or try again.')
        }
        return success

    }
}