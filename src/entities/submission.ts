
export default class Submission {
    id!: string
    user_id!: string
    problem_id!: string
    difficulty!: number
    user_input!: string
    timer?: number | null
    approach_score?: number
    identified_approach!: string | ""
    pass!: boolean
    missing_points!: string[] | []
    edge_cases_missed!: string[] | []
    edge_case_score!: number
    submitted_at!: string
}