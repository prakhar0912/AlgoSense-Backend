export default class ShortSubmission {
  submission_id!: string
  problem_id!: string
  difficulty!: number
  timer?: number | null
  approach_score!: number
  identified_approach!: string
  pass!: boolean
  edge_case_score!: number
  submitted_at!: string
}

