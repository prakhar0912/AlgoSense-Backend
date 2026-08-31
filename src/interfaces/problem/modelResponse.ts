export interface ModelResponse {
  user_explanation_identified_apporach: string,
  user_explanation_rating: "optimal" | "correct" | "partially_correct" | "incorrect",
  user_explanation_pass: boolean,
  missing_points_in_user_explanation: string,
  edge_cases: {
    coverage: "correct" | "incorrect" | "missing" | "partial",
    case: string,
    tag?: string,
    importance: "critical" | "high" | "medium" | "low",
  }[] | []
};
