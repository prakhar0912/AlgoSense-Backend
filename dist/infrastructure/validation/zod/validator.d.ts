import zod from 'zod';
import type IValidator from '../../../interfaces/validator.js';
import type { IValidatorResult } from '../../../interfaces/validator.js';
export default class ZodValidator<T> implements IValidator<T> {
    protected schema: zod.ZodType<T>;
    constructor(schema: zod.ZodType<T>);
    validate(body: Partial<T>): IValidatorResult<T>;
}
//# sourceMappingURL=validator.d.ts.map