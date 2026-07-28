export default class Submission {
    id: string;
    user_id: string;
    problem_id: string;
    difficulty: "easy" | "medium" | "hard" | "expert";
    user_input: string;
    timer?: number | null;
    approach_score: number;
    identified_approach: string | "";
    pass: boolean;
    missing_points: string;
    edge_cases: {
        description: string;
        importance: "critical" | "high" | "medium" | "low";
        coverage: string;
    }[] | [];
    edge_case_score: number;
    submitted_at: string;
}
//# sourceMappingURL=submission.d.ts.map