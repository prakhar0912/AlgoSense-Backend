import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod'



const problemSolutionValidator = z.string().min(20, "Solution must be at least 20 characters long").max(1500, "Solution must be at most 1500 characters long").transform((val) => sanitize(val))

export default new ZodValidator(problemSolutionValidator)