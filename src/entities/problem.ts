import { Approach } from "./approach.js"
export default class Problem {
  id!: string
  title!: string
  description!: string
  rating!: number
  slug!: string
  hints!: string[] | []
  primary_topics!: string[] | []
  secondary_topics!: string[] | []
  difficulty!: "easy" | "medium" | "hard" | "expert"
  approaches!: Approach[]
  evaluation_criteria!: string[]
  similar_problems!: string[] | []
}

// id uuid NOT NULL DEFAULT uuidv7(),
// title character varying(1000) COLLATE pg_catalog."default" NOT NULL,
// description character varying(1000) COLLATE pg_catalog."default" NOT NULL,
// difficulty difficulty_enum NOT NULL,
// approaches jsonb[] NOT NULL,
// evaluation_criteria character varying(1000)[] COLLATE pg_catalog."default" NOT NULL,
// rating double precision NOT NULL,
// slug character varying(200) COLLATE pg_catalog."default" NOT NULL,
// primary_topics character varying(100)[] COLLATE pg_catalog."default",
// secondary_topics character varying(100)[] COLLATE pg_catalog."default"
// hints character varying(1000)[] COLLATE pg_catalog."default",
// similar_problems character varying(500)[] COLLATE pg_catalog."default",

