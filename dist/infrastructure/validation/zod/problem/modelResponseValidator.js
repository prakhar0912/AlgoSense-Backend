import ZodValidator from "../validator.js";
import { sanitize } from "isomorphic-dompurify";
import z from 'zod';
//BUG: Might not coerce values to required types, required for further processing
const modelResponseValidator = z.object({
    user_explanation_rating: z.enum(["optimal", "correct", "partially_correct", "incorrect"]),
    user_explanation_identified_apporach: z.string().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
    user_explanation_pass: z.boolean(),
    missing_points_in_user_explanation: z.string().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
    edge_cases_missed_in_user_explanation: z.array(z.object({
        missed_edge_case_description: z.string().max(1000, "Must be less than 1000 characters").transform((val) => sanitize(val)),
        edge_case_coverage: z.enum([
            "correct",
            "partial",
            "incorrect",
            "missing",
        ])
    })),
}).strict();
export default new ZodValidator(modelResponseValidator);
//# sourceMappingURL=modelResponseValidator.js.map