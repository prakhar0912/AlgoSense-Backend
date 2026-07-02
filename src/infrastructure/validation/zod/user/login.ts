import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod'

const loginValidator = z.object({
  email: z.email('Invalid email address').trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)),
  password: z.string().trim().min(6, 'Password must be at least 6 characters long').max(50, "Must be less than 50 characters")
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" })
    .transform((val) => sanitize(val)),
})

export default new ZodValidator(loginValidator)
