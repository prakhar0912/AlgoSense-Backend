import type Submission from "../../entities/submission.js";
import type IPaginated from "../paginated.js";

export default interface ISubmissionDAO {
  create(submissionPayload: Partial<Submission>): Promise<Submission> // Save submissionPayload into the submissions table
  viewById(submissionId: string): Promise<Submission> // Find and return submission row using sumbmissionId in the submissions table
  viewByUser(userId: string): Promise<IPaginated<Submission>> //Find and return all submissions (in paginated format by IPaginated) that have user_id column as argument "userId" 
  viewScoresByUser(userId: string): Promise<Pick<Submission, 'problem_id' | 'difficulty' | 'approach_score' | 'edge_case_score' | 'submitted_at'>[] | []> //Find and return an array of data containing {problem_id, approach_score, edge_case_scores, submitted_at, difficulty} from the "submissions" table, return 1 submission data per problem_id, the submission that has the highest approach_score(smallInt), if multiple submissions have the same approach_score then get the one with the highest edge_case_score(smallInt). If no such submissions exist then return an empty array [].
}
