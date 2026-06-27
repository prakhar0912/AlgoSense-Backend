import ZodValidator from "../validator.js";
import z from 'zod'

const updateProfileValidator = z.object({
    first_name: z.string().trim().min(1, 'First name is required').max(100, "Must be less than 100 characters").optional(),
    last_name: z.string().trim().min(1, 'Last name is required').max(100, "Must be less than 100 characters").optional(),
    email: z.email('Invalid email address').trim().max(100, "Must be less than 100 characters").optional(),
    email_notifications_enabled: z.boolean().optional()
})
export default new ZodValidator(updateProfileValidator)