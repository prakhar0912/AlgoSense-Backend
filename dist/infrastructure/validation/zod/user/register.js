import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod';
const registerValidator = z.object({
    id: z.string().trim().min(1, 'id should be provided').max(50, "Must be less than 50 characters").transform((val) => sanitize(val)),
    first_name: z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)).optional(), // Use sanitizedHtmlSchem
    last_name: z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)).optional(),
    email: z.email('Invalid email address').max(100, "Must be less than 100 characters").trim().transform((val) => sanitize(val)),
    email_notifications_enabled: z.boolean().optional(),
    created_at: z.string().trim().min(1, "Should be provided").max(50, "Should be at max 50 characters").transform((val) => sanitize(val)),
    email_verified: z.boolean(),
}).strict();
export default new ZodValidator(registerValidator);
//# sourceMappingURL=register.js.map