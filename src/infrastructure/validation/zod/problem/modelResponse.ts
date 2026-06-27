import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod'



const modelResponseValidator = z.object({
    approach_score: z.number().int("Must be a whole number").min(1).max(10),
    edge_case_score: z.number().int("Must be a whole number").min(1).max(10),
    identified_approach: z.string().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
    pass: z.boolean(),
    missing_points: z.array(z.string().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))),
    edge_cases_missed: z.array(z.string().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))),
}).strict()

export default new ZodValidator(modelResponseValidator)