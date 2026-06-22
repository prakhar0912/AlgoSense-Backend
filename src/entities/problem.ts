export default class Problem {
    id!: string
    title!: string
    description!: string
    testCases!: string[]
    difficulty!: 1 | 2.5 | 6 | 7
    approaches!: {
        type: string
        primary_technique?: string
        time_complexity: string
        space_complexity: string
        req_or_constraints: string
        steps: string[]
        explanation: string
        edge_cases: {
            case: string
            importance: number
        }[]
    }[]
    evaluation_criteria!: string[]
}