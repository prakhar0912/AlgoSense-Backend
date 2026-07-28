import type { PoolClient } from "pg";
import Problem from "../../entities/problem.js";
import type IPaginated from "../../interfaces/paginated.js";
import type IProblemDAO from "../../interfaces/problem/problemDAO.js";
type DbClient = Pick<PoolClient, "query">;
export default class ProblemDAO implements IProblemDAO {
    private readonly db;
    constructor(db?: DbClient);
    create(problemData: Partial<Problem>): Promise<Problem>;
    update(problemId: string, payload: Partial<Problem>): Promise<Problem>;
    delete(problemId: string): Promise<boolean>;
    findById(problemId: string): Promise<Problem | null>;
    list(filters: Partial<Problem>, page: number, perPage: number): Promise<IPaginated<Problem>>;
    findByName(name: string): Promise<Problem | null>;
    private buildFilterClause;
}
export {};
//# sourceMappingURL=problemDAO.d.ts.map