import { Approach } from "./approach.js";
export default class Problem {
    id: string;
    title: string;
    description: string;
    testCases: string[];
    difficulty: "easy" | "medium" | "hard" | "expert";
    approaches: Approach[];
    evaluation_criteria: string[];
}
//# sourceMappingURL=problem.d.ts.map