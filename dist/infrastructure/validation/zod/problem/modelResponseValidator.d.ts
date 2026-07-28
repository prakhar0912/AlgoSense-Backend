import ZodValidator from "../validator.js";
declare const _default: ZodValidator<{
    user_explanation_rating: "optimal" | "correct" | "partially_correct" | "incorrect";
    user_explanation_identified_apporach: string;
    user_explanation_pass: boolean;
    missing_points_in_user_explanation: string;
    edge_cases_missed_in_user_explanation: {
        missed_edge_case_description: string;
        edge_case_coverage: "correct" | "incorrect" | "partial" | "missing";
    }[];
}>;
export default _default;
//# sourceMappingURL=modelResponseValidator.d.ts.map