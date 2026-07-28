import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod'

const updateUserValidator = z.object({
  first_name: z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)),
  last_name: z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)),
  email: z.email('Invalid email address').trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)),
  email_notifications_enabled: z.boolean(),
  role: z.enum(['admin', 'user']),
  banned: z.boolean(),
  email_verified: z.boolean(),
  scores: z.object({
    approaches_score: z.number(),
    days_logged_in: z.array(z.string().max(100, "Must be less than 100 characters").transform((val) => sanitize(val))),
    consistency_score: z.number(),
    edge_case_score: z.number(),
    total_score: z.number()
  }).partial().strict().nullable(),
  last_5_submissions: z.array(z.object({
    submission_id: z.string().max(500, "Must be less than 500 characters").transform((val) => sanitize(val)),
    problem_id: z.string().max(500, "Must be less than 500 characters").transform((val) => sanitize(val)),
    difficulty: z.enum(["easy", "medium", "hard", "expert"]),
    timer: z.number().nullable(),
    approach_score: z.number().min(1).max(10),
    identified_approach: z.string().max(1500, "Must be less than 1500 characters").transform((val) => sanitize(val)),
    pass: z.boolean(),
    edge_case_score: z.number().min(1).max(10),
    submitted_at: z.string().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)),
  }).partial().strict()).nullable(),
})
  .partial()
  .strict()
  .nullish()



export default new ZodValidator(updateUserValidator)
