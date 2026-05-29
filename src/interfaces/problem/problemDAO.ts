import Problem from "../../entities/problem.js"
import type IPaginated from "../../interfaces/paginated.js"

export default interface IProblemDAO {
    create(problemData: Partial<Problem>): Promise<Problem>
    update(problemId: string, payload: Partial<Problem>): Promise<Problem>
    delete(problemId: string): Promise<boolean>
    findById(problemId: string): Promise<Problem | null>
    list(filters: Partial<Problem>, page: number, perPage: number): Promise<IPaginated<Problem>>
    findByName(name: string): Promise<Problem | null>
}