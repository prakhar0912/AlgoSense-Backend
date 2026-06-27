import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod'



const updatePasswordValidator = z.object({
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
        message: "must match password",
        path: ["retyped_password"], // Highlights the retyped_password field on failure
    });

export default new ZodValidator(updatePasswordValidator)