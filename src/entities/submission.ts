
export default class Submission {
    id!: string
    userId!: string
    problemId!: string
    userInput!: string
    timer?: number | null
    approachScore?: number
    identifiedApproach!: string | ""
    pass!: boolean
    missingPoints!: string[] | []
    edgeCasesMissed!: string[] | []
    edgeCaseScore!: number
    submittedAt!: Date
}