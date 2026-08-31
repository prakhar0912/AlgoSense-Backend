export class ShortSubmission {
  submission_id!: string
  problem_id!: string
  problem_title!: string
  difficulty!: "easy" | "medium" | "hard" | "expert"
  timer?: number | null
  approach_score!: number
  identified_approach!: string
  pass!: boolean
  edge_case_score!: number
  submitted_at!: string
}

