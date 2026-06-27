import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod'

enum difficulties {
    easy = 1,
    medium = 2.5,
    hard = 6,
    expert = 7
}


const createProblemValidator = z.object({
    title: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
    description: z.string().trim().min(10, 'description must be at least 10 characters long').max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
    testCases: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))),
    difficulty: z.enum(difficulties),
    approaches: z.array(z.object({
        type: z.string().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
        primary_technique: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)).optional(),
        time_complexity: z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)),
        space_complexity: z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)),
        req_or_constraints: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
        steps: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))),
        explanation: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
        edge_cases: z.array(z.object({
            case: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)).optional(),
            importance: z.number().min(1).max(10).optional(),
        })),
        pros: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))).optional(),
        cons: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))).optional()
    })),
    evaluation_criteria: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)))
}).strict()

export default new ZodValidator(createProblemValidator)