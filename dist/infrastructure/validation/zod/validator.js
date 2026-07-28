import zod from 'zod';
import { clearWindow } from "isomorphic-dompurify";
export default class ZodValidator {
    schema;
    constructor(schema) {
        this.schema = schema;
    }
    validate(body) {
        const result = this.schema.safeParse(body);
        clearWindow();
        if (result.success === true) {
            return {
                success: result.success,
                data: result.data,
            };
        }
        else if (result.success === false) {
            return {
                success: result.success,
                errors: result.error.issues.map((issue) => ({
                    field: issue.path.join(', '),
                    message: issue.message,
                }))
            };
        }
        else {
            throw new Error('Unexpected validation result');
        }
    }
}
//# sourceMappingURL=validator.js.map