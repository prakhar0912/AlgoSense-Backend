import { UserScores } from "./userScores.js"
import { ShortSubmission } from "./shortSubmission.js"

export class User {
  id!: string
  email!: string
  first_name?: string | undefined
  last_name?: string | undefined
  role!: 'admin' | 'user'
  banned!: boolean
  scores?: UserScores
  created_at!: string
  last_5_submissions?: ShortSubmission[] | null
  email_verified!: boolean
  email_notifications_enabled!: boolean
}
// id uuid NOT NULL DEFAULT uuidv7(),
// email character varying(100) COLLATE pg_catalog."default" NOT NULL,
// first_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
// last_name character varying(100) COLLATE pg_catalog."default",
// email_notifications_enabled boolean NOT NULL,
// role roles NOT NULL,
// banned boolean NOT NULL,
// created_at character varying(30) COLLATE pg_catalog."default" NOT NULL,
// email_verified boolean NOT NULL,
// scores jsonb,
// last_5_submissions jsonb[],
