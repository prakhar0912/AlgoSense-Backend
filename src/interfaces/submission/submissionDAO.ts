import type Submission from "../../entities/submission.js";
import type IPaginated from "../paginated.js";

export default interface ISubmissionDAO{
    create(submissionPayload: Partial<Submission>):Promise<Submission>
    viewById(submissionId: string): Promise<Submission>
    viewByUser(userId: string):Promise<IPaginated<Submission>>
}