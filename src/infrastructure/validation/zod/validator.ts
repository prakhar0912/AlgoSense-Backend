import zod from 'zod'
import type IValidator from '../../../interfaces/validator.js';
import type { IValidatorResult } from '../../../interfaces/validator.js';
import { clearWindow } from "isomorphic-dompurify";


export default class ZodValidator<T> implements IValidator<T> {
    constructor(protected schema: zod.ZodType<T>) { }
    validate(body: Partial<T>): IValidatorResult<T> {
        const result = this.schema.safeParse(body)
        clearWindow()
        if (result.success === true) {
            return {
                success: result.success,
                data: result.data,
            }
        }
        else if(result.success === false) {
            return {
                success: result.success,
                errors: result.error.issues.map((issue) => ({
                    field: issue.path.join(', '),
                    message: issue.message,
                }))
            }
        }
        else{
            throw new Error('Unexpected validation result')
        }
    }
} 