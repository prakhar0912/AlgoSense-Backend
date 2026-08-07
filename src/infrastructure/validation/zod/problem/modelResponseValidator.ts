import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod'


const modelResponseValidator = z.object({
  user_explanation_rating: z.enum(["optimal", "correct", "partially_correct", "incorrect"]),
  user_explanation_identified_apporach: z.string().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
  user_explanation_pass: z.boolean(),
  missing_points_in_user_explanation: z.string().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
  edge_cases: z.array(
    z.object({
      importance: z.enum([
        "critical", "high", "medium", "low"
      ]),
      case: z.string().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
      coverage: z.enum([
        "correct",
        "partial",
        "incorrect",
        "missing",
      ])
    })
  ),
}).strict()

// console.log(new ZodValidator(modelResponseValidator).validate(
//   {
//     user_explanation_identified_apporach: 'Binary search on the answer',
//     user_explanation_rating: 'partially_correct',
//     user_explanation_pass: false,
//     missing_points_in_user_explanation: 'Need to enforce j > i (search lower bound i+1) and ensure left/right boundaries respect i+1 <= j <= n-2. Also need to handle case where prefix sums may have duplicates and binary search returns first/last valid j correctly.The explanation omitted explicit lower bound for binary search and the clamping of left boundary to at least i+ 1.',
//     edge_cases_missed_in_user_explanation: [
//       {
//         edge_case_coverage: 'incorrect',
//         missed_edge_case_description: 'The brute-force version should still match the exact definition of Ways to Split Array Into Three Subarrays.'
//       }
//     ]
//   }
//
// ))
//

export default new ZodValidator(modelResponseValidator)
