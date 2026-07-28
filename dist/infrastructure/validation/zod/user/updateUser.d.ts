import ZodValidator from "../validator.js";
declare const _default: ZodValidator<Record<string, never> | {
    first_name: string;
    last_name: string;
    email: string;
    email_notifications_enabled: boolean;
    role: "admin" | "user";
    banned: boolean;
    email_verified: boolean;
    scores: {
        approaches_score: number;
        days_logged_in: string[];
        consistency_score: number;
        edge_case_score: number;
        total_score: number;
    } | null;
    last_5_submissions: {
        submission_id: string;
        problem_id: string;
        difficulty: "medium" | "easy" | "hard" | "expert";
        timer: number | null;
        approach_score: number;
        identified_approach: string;
        pass: boolean;
        edge_case_score: number;
        submitted_at: string;
    }[] | null;
}>;
export default _default;
//# sourceMappingURL=updateUser.d.ts.map