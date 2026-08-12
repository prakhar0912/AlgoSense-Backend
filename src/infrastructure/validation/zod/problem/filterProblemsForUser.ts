import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod'

const filterProblemsForUser =
  z.object({
    id: z.string().trim().min(1, 'id should be provided').max(100, "Must be less than 100 characters").transform((val) => sanitize(val)),
    title: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
    description: z.string().trim().min(10, 'description must be at least 10 characters long').max(1000, "Must be less than 1000 characters"),
    difficulty: z.enum(["easy", "medium", "hard", "expert"]),
    rating: z.number().max(4000),
    slug: z.string().trim().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
    primary_topics: z.array(z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val))),
    secondary_topics: z.array(z.string().trim().max(100, "Must be less than 100 characters").transform((val) => sanitize(val))),
    similar_problems: z.array(z.string().trim().max(500, "Must be less than 500 characters").transform((val) => sanitize(val))),
  }).partial().strict()

export default new ZodValidator(filterProblemsForUser)
