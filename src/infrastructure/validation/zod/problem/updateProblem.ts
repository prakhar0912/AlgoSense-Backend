import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod'


const updateProblemValidator = z.object({
  title: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)).optional(),
  description: z.string().trim().min(10, 'description must be at least 10 characters long').max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)).optional(),
  testCases: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))).optional(),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]).optional(),
  approaches: z.array(z.object({
    type: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)).optional(),
    primary_technique: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)).optional(),
    time_complexity: z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)).optional(),
    space_complexity: z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val)).optional(),
    req_or_constraints: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)).optional(),
    steps: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))).optional(),
    explanation: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)).optional(),
    edge_cases: z.array(z.object({
      case: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)).optional(),
      importance: z.enum(["critical", "high", "medium", "low"]).optional(),
    })),
    pros: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))).optional(),
    cons: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))).optional()
  })).optional(),
  evaluation_criteria: z.array(z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val))).optional()
}).strict()

export default new ZodValidator(updateProblemValidator)
