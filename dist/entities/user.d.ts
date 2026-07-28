import UserScores from "./userScores.js";
import ShortSubmission from "./shortSubmission.js";
export default class User {
    id: string;
    email: string;
    first_name?: string | undefined;
    last_name?: string | undefined;
    role: 'admin' | 'user';
    banned: boolean;
    scores?: UserScores | null;
    created_at: string;
    last_5_submissions?: ShortSubmission[] | null;
    email_verified: boolean;
    email_notifications_enabled: boolean;
}
//# sourceMappingURL=user.d.ts.map