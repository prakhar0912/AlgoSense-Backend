import ZodValidator from "../validator.js";
declare const _default: ZodValidator<{
    id?: string | undefined;
    first_name?: string | undefined;
    last_name?: string | undefined;
    email?: string | undefined;
    email_notifications_enabled?: boolean | undefined;
    role?: "admin" | "user" | undefined;
    banned?: boolean | undefined;
    email_verified?: boolean | undefined;
    scores?: {
        approaches_score?: number | undefined;
        days_logged_in?: string[] | undefined;
        consistency_score?: number | undefined;
        edge_case_score?: number | undefined;
        total_score?: number | undefined;
    } | null | undefined;
    last_5_submissions?: {
        submission_id?: string | undefined;
        problem_id?: string | undefined;
        difficulty?: "medium" | "easy" | "hard" | "expert" | undefined;
        timer?: number | null | undefined;
        approach_score?: number | undefined;
        identified_approach?: string | undefined;
        pass?: boolean | undefined;
        edge_case_score?: number | undefined;
        submitted_at?: string | undefined;
    }[] | null | undefined;
    created_at?: string | undefined;
}>;
export default _default;
//# sourceMappingURL=filterUsers.d.ts.map