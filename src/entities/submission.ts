
export default class Submission {
  id!: string
  user_id!: string
  problem_id!: string
  difficulty!: "easy" | "medium" | "hard" | "expert"
  problem_rating!: number
  user_input!: string
  hints_used!: string[] | []
  timer?: number | null
  approach_score!: number
  identified_approach!: string | ""
  pass!: boolean
  missing_points!: string
  edge_cases!: { description: string, importance: "critical" | "high" | "medium" | "low", coverage: "correct" | "partial" | "incorrect" | "missing" }[] | []
  edge_case_score!: number
  submitted_at!: string
  elo_dif!: number
}
// id uuid NOT NULL DEFAULT uuidv7(),
//     user_id uuid NOT NULL,
//     problem_id uuid NOT NULL,
//     timer bigint,
//     approach_score smallint NOT NULL,
//     identified_approach character varying(100) COLLATE pg_catalog."default" NOT NULL,
//     pass boolean NOT NULL,
//     edge_case_score smallint NOT NULL,
//     submitted_at character varying(30) COLLATE pg_catalog."default" NOT NULL,
//     edge_cases jsonb[],
//     user_input character varying(3000) COLLATE pg_catalog."default",
//     difficulty difficulty_enum NOT NULL,
//     problem_rating double precision NOT NULL,
//     hints_used character varying(1000)[] COLLATE pg_catalog."default",
//     elo_diff double precision NOT NULL,
//     missing_points character varying(4000) COLLATE pg_catalog."default",
//



