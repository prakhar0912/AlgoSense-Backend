import { Problem } from "../../entities/index.js"
import type { IPaginated } from "../../interfaces/index.js"

export interface IProblemDAO {
  create(problemData: Partial<Problem>): Promise<Problem>
  update(problemId: string, payload: Partial<Problem>): Promise<Problem>
  delete(problemId: string): Promise<boolean>
  findById(problemId: string): Promise<Problem | null>
  list(filters: Partial<Problem>, page: number, perPage: number): Promise<IPaginated<Problem>>
  findByName(name: string): Promise<Problem | null>
  listForUser(filters: Partial<Omit<Problem, 'hints' | 'evaluation_criteria' | 'approaches'>>, page: number, perPage: number): Promise<IPaginated<Omit<Problem, 'hints' | 'evaluation_criteria' | 'approaches'>>> //Use filter object that contains key value pairs to return a paginated response of the filtered Problems from the "problems" table. Make sure to not query the following columns "approaches", "hints", "evaluation_criteria"
  findByIdForUsers(problemId: string): Promise<Omit<Problem, 'hints' | 'evaluation_criteria' | 'approaches'> | null> // Find and return the problem without the "approaches", "hints", and "evaluation_criteria" fields, using the problemId which is the "id" column in the "problems" table. Make sure to not query the following columns "approaches", "hints", "evaluation_criteria"
  findBySlugForUsers(problemSlug: string): Promise<Omit<Problem, 'hints' | 'evaluation_criteria' | 'approaches'> | null> // Find and return the problem without the "approaches", "hints", and "evaluation_criteria" fields, using the problemSlug which is the "slug" column in the "problems" table. Make sure to not query the following columns "approaches", "hints", "evaluation_criteria"
  findBySlug(problemSlug: string): Promise<Problem | null> // Find and return the problem without the "approaches", "hints", and "evaluation_criteria" fields, using the problemSlug which is the "slug" column in the "problems" table. Make sure to not query the following columns "approaches", "hints", "evaluation_criteria"
}
