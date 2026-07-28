import ZodValidator from "../validator.js";
declare const _default: ZodValidator<Record<string, never> | {
    title: string;
    description: string;
    testCases: string[];
    difficulty: "medium" | "easy" | "hard" | "expert";
    approaches: {
        type: string;
        primary_technique: string;
        time_complexity: string;
        space_complexity: string;
        req_or_constraints: string;
        steps: string[];
        explanation: string;
        edge_cases: {
            case: string;
            importance: "critical" | "high" | "medium" | "low";
        }[];
        pros: string[];
        cons: string[];
    }[];
    evaluation_criteria: string[];
}>;
export default _default;
//# sourceMappingURL=updateProblem.d.ts.map