import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod'



const updateUserValidator = z.object({
    first_name: z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)).optional(),
    last_name: z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)).optional(),
    email: z.email('Invalid email address').trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)).optional(),
    email_notifications_enabled: z.boolean().optional(),
    role: z.enum(['admin', 'user']).optional(),
    banned: z.boolean().optional(),
    email_verified: z.boolean().optional(),
    scores: z.object({
        approaches_score: z.number().optional(),
        days_logged_in: z.array(z.string().max(100, "Must be less than 100 characters").transform((val) => sanitize(val))).optional(),
        consistency_score: z.number().optional(),
        edge_case_score: z.number().optional(),
        total_score: z.number().optional()
    }).optional().nullable(),
    submissions: z.array(z.object({
        id: z.string().max(500, "Must be less than 500 characters").transform((val) => sanitize(val)),
        approach_score: z.number().min(1).max(10).optional(),
        edge_case_score: z.number().min(1).max(10).optional(),
        user_input: z.string().max(1500, "Must be less than 1500 characters").transform((val) => sanitize(val)).optional(),
        pass: z.boolean().optional(),
        missing_points: z.array(z.string().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))).optional(),
        edge_cases_missed: z.array(z.string().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))).optional(),
    })).optional().nullable()
})
.strict()

export default new ZodValidator(updateUserValidator)