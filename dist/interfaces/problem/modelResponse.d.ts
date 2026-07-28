export default interface ModelResponse {
    user_explanation_identified_apporach: string;
    user_explanation_rating: "optimal" | "correct" | "partially_correct" | "incorrect";
    user_explanation_pass: boolean;
    missing_points_in_user_explanation: string;
    edge_cases_missed_in_system_explanation: {
        edge_case_coverage: "correct" | "incorrect" | "missing" | "partial";
        missed_edge_case_description: string;
    }[] | [];
}
//# sourceMappingURL=modelResponse.d.ts.map