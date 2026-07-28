import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod';
const updateProblemValidator = z.object({
    title: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
    description: z.string().trim().min(10, 'description must be at least 10 characters long').max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
    testCases: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))),
    difficulty: z.enum(["easy", "medium", "hard", "expert"]),
    approaches: z.array(z.object({
        type: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
        primary_technique: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
        time_complexity: z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)),
        space_complexity: z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)),
        req_or_constraints: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
        steps: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))),
        explanation: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
        edge_cases: z.array(z.object({
            case: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
            importance: z.enum(["critical", "high", "medium", "low"]),
        })),
        pros: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))),
        cons: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)))
    })),
    evaluation_criteria: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)))
}).partial().strict();
export default new ZodValidator(updateProblemValidator);
//# sourceMappingURL=updateProblem.js.map