import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod'



const registerValidator = z.object({
    first_name: z.string().trim().min(1, 'First name is required').max(100, "Must be less than 100 characters").transform((val) => sanitize(val)), // Use sanitizedHtmlSchem
    last_name: z.string().trim().min(1, 'Last name is required').max(100, "Must be less than 100 characters").transform((val) => sanitize(val)).optional(),
    email: z.email('Invalid email address').max(100, "Must be less than 100 characters").trim().transform((val) => sanitize(val)),
    password: z.string().trim().min(6, 'Password must be at least 6 characters long').max(50, "Must be less than 50 characters")
            .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
            .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
            .regex(/[0-9]/, { message: "Password must contain at least one number" })
            .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" })
            .transform((val) => sanitize(val)),
    retyped_password: z.string().trim().min(6, 'Password must be at least 6 characters long').max(50, "Must be less than 50 characters")
            .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
            .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
            .regex(/[0-9]/, { message: "Password must contain at least one number" })
            .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" })
            .transform((val) => sanitize(val)),
    email_notifications_enabled: z.boolean().optional(),
})
    .strict()
    .refine((data) => {
        // If password exists, retyped_password must exist and match it
        if (data.password) {
            return data.retyped_password === data.password;
        }
        // If password doesn't exist, retyped_password shouldn't be provided
        return data.retyped_password === undefined;
    }, {
        message: "passwords must match",
        path: ["retyped_password"], // Highlights the retyped_password field on failure
    });

export default new ZodValidator(registerValidator)