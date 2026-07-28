import ProblemDAO from '../infrastructure/data-access/problemDAO.js';
import UserDAO from '../infrastructure/data-access/userDAO.js';
import SubmissionDAO from '../infrastructure/data-access/submissionDAO.js';
declare const _default: {
    user: {
        validators: {
            updateUser: import("../infrastructure/validation/zod/validator.js").default<{
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
                    difficulty?: "easy" | "medium" | "hard" | "expert" | undefined;
                    timer?: number | null | undefined;
                    approach_score?: number | undefined;
                    identified_approach?: string | undefined;
                    pass?: boolean | undefined;
                    edge_case_score?: number | undefined;
                    submitted_at?: string | undefined;
                }[] | null | undefined;
            } | null | undefined>;
            registerValidator: import("../infrastructure/validation/zod/validator.js").default<{
                id: string;
                email: string;
                created_at: string;
                email_verified: boolean;
                first_name?: string | undefined;
                last_name?: string | undefined;
                email_notifications_enabled?: boolean | undefined;
            }>;
            updateUserValidator: import("../infrastructure/validation/zod/validator.js").default<{
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
                    difficulty?: "easy" | "medium" | "hard" | "expert" | undefined;
                    timer?: number | null | undefined;
                    approach_score?: number | undefined;
                    identified_approach?: string | undefined;
                    pass?: boolean | undefined;
                    edge_case_score?: number | undefined;
                    submitted_at?: string | undefined;
                }[] | null | undefined;
            } | null | undefined>;
            filterUsers: import("../infrastructure/validation/zod/validator.js").default<{
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
        DAO: typeof UserDAO;
    };
    problem: {
        validators: {
            problemValidator: import("../infrastructure/validation/zod/validator.js").default<{
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
            problemSolutionValidator: import("../infrastructure/validation/zod/validator.js").default<string>;
            updateProblemValidator: import("../infrastructure/validation/zod/validator.js").default<{
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
            modelResponseValidator: import("../infrastructure/validation/zod/validator.js").default<{
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
        DAO: typeof ProblemDAO;
    };
    submission: {
        DAO: typeof SubmissionDAO;
    };
    utils: {
        askGPT: (problem: import("../entities/problem.js").default, userInput: string) => Promise<import("../interfaces/problem/modelResponse.js").default>;
        getConsistencyScore: (daysLoggedIn: string[]) => number;
    };
    weights: {
        totalScoreWeights: {
            approach_score: number;
            edge_case_score: number;
            consistency_score: number;
        };
        approachScoreWeights: {
            max: number;
            optimal: number;
            correct: number;
            partially_correct: number;
            incorrect: number;
        };
        edgeCaseImportanceWeights: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        edgeCaseCoverageWeights: {
            correct: number;
            partial: number;
            incorrect: number;
            missing: number;
        };
        problemDifficultyWeights: {
            easy: number;
            medium: number;
            hard: number;
            expert: number;
        };
    };
};
export default _default;
//# sourceMappingURL=services.d.ts.map