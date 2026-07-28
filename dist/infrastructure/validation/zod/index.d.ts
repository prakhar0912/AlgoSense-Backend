export declare const user: {
    updateUser: import("./validator.js").default<{
        first_name?: string | undefined;
        last_name?: string | undefined;
        email?: string | undefined;
        email_notifications_enabled?: boolean | undefined;
        role?: "user" | "admin" | undefined;
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
            difficulty?: "easy" | "medium" | "hard" | "expert" | undefined;
            timer?: number | null | undefined;
            approach_score?: number | undefined;
            identified_approach?: string | undefined;
            pass?: boolean | undefined;
            edge_case_score?: number | undefined;
            submitted_at?: string | undefined;
        }[] | null | undefined;
    } | null | undefined>;
    registerValidator: import("./validator.js").default<{
        id: string;
        email: string;
        created_at: string;
        email_verified: boolean;
        first_name?: string | undefined;
        last_name?: string | undefined;
        email_notifications_enabled?: boolean | undefined;
    }>;
    updateUserValidator: import("./validator.js").default<{
        first_name?: string | undefined;
        last_name?: string | undefined;
        email?: string | undefined;
        email_notifications_enabled?: boolean | undefined;
        role?: "user" | "admin" | undefined;
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
            difficulty?: "easy" | "medium" | "hard" | "expert" | undefined;
            timer?: number | null | undefined;
            approach_score?: number | undefined;
            identified_approach?: string | undefined;
            pass?: boolean | undefined;
            edge_case_score?: number | undefined;
            submitted_at?: string | undefined;
        }[] | null | undefined;
    } | null | undefined>;
    filterUsers: import("./validator.js").default<{
        id?: string | undefined;
        first_name?: string | undefined;
        last_name?: string | undefined;
        email?: string | undefined;
        email_notifications_enabled?: boolean | undefined;
        role?: "user" | "admin" | undefined;
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
            difficulty?: "easy" | "medium" | "hard" | "expert" | undefined;
            timer?: number | null | undefined;
            approach_score?: number | undefined;
            identified_approach?: string | undefined;
            pass?: boolean | undefined;
            edge_case_score?: number | undefined;
            submitted_at?: string | undefined;
        }[] | null | undefined;
        created_at?: string | undefined;
    } | null | undefined>;
};
export declare const problem: {
    problemValidator: import("./validator.js").default<{
        title: string;
        description: string;
        testCases: string[];
        difficulty: "easy" | "medium" | "hard" | "expert";
        approaches: {
            type: string;
            time_complexity: string;
            space_complexity: string;
            req_or_constraints: string;
            steps: string[];
            explanation: string;
            edge_cases: {
                case: string;
                importance: "medium" | "critical" | "high" | "low";
            }[];
            primary_technique?: string | undefined;
            pros?: string[] | undefined;
            cons?: string[] | undefined;
        }[];
        evaluation_criteria: string[];
    }>;
    problemSolutionValidator: import("./validator.js").default<string>;
    updateProblemValidator: import("./validator.js").default<{
        title?: string | undefined;
        description?: string | undefined;
        testCases?: string[] | undefined;
        difficulty?: "easy" | "medium" | "hard" | "expert" | undefined;
        approaches?: {
            type: string;
            primary_technique: string;
            time_complexity: string;
            space_complexity: string;
            req_or_constraints: string;
            steps: string[];
            explanation: string;
            edge_cases: {
                case: string;
                importance: "medium" | "critical" | "high" | "low";
            }[];
            pros: string[];
            cons: string[];
        }[] | undefined;
        evaluation_criteria?: string[] | undefined;
    }>;
    modelResponseValidator: import("./validator.js").default<{
        user_explanation_rating: "optimal" | "correct" | "partially_correct" | "incorrect";
        user_explanation_identified_apporach: string;
        user_explanation_pass: boolean;
        missing_points_in_user_explanation: string;
        edge_cases_missed_in_user_explanation: {
            missed_edge_case_description: string;
            edge_case_coverage: "correct" | "incorrect" | "partial" | "missing";
        }[];
    }>;
};
//# sourceMappingURL=index.d.ts.map