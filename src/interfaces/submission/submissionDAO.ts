import type Submission from "../../entities/submission.js";
import type IPaginated from "../paginated.js";

export default interface ISubmissionDAO {
  create(submissionPayload: Partial<Submission>): Promise<Submission> // Save submissionPayload into the submissions table
  viewById(submissionId: string): Promise<Submission> // Find and return submission row using sumbmissionId in the submissions table
  viewByUser(userId: string): Promise<IPaginated<Submission>> //Find and return all submissions (in paginated format by IPaginated) that have user_id column as argument "userId" 
}
