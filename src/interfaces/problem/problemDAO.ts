import Problem from "../../entities/problem.js"
import type IPaginated from "../../interfaces/paginated.js"

export default interface IProblemDAO {
    create(problemData: Partial<Problem>): Promise<Problem>
    update(payload: Partial<Problem>): Promise<Problem>
    delete(problemId: string): Promise<void>
    findById(problemId: string): Promise<Problem | null>
    findAll(filters: Partial<Problem>, page: number, perPage: number): Promise<IPaginated<Problem>>
    findByName(name: string): Promise<Problem | null>
}