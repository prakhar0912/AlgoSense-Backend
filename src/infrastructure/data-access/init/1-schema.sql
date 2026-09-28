CREATE TYPE public.difficulty_enum AS ENUM
    ('easy', 'medium', 'hard', 'expert');

CREATE TYPE public.roles AS ENUM
    ('admin', 'user');

CREATE TYPE public.submission_status AS ENUM
    ('pending', 'evaluating', 'completed', 'failed');


CREATE TABLE IF NOT EXISTS public.users
(
    email character varying(100) COLLATE pg_catalog."default" NOT NULL,
    first_name character varying(100) COLLATE pg_catalog."default",
    last_name character varying(100) COLLATE pg_catalog."default",
    email_notifications_enabled boolean NOT NULL,
    role roles NOT NULL,
    banned boolean NOT NULL,
    created_at character varying(30) COLLATE pg_catalog."default" NOT NULL,
    email_verified boolean NOT NULL,
    scores jsonb,
    last_5_submissions jsonb[],
    id character varying(100) COLLATE pg_catalog."default" NOT NULL,
    deleted_at character varying(100) COLLATE pg_catalog."default",
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT "Unique Email" UNIQUE (email)
)

TABLESPACE pg_default;

COMMENT ON CONSTRAINT "Unique Email" ON public.users
    IS 'The Email must be unique because one user can have only one account';



CREATE TABLE IF NOT EXISTS public.problems
(
    id uuid NOT NULL DEFAULT uuidv7(),
    title character varying(1000) COLLATE pg_catalog."default" NOT NULL,
    description character varying(3000) COLLATE pg_catalog."default" NOT NULL,
    difficulty difficulty_enum NOT NULL,
    approaches jsonb[] NOT NULL,
    evaluation_criteria character varying(1000)[] COLLATE pg_catalog."default" NOT NULL,
    rating double precision NOT NULL,
    slug character varying(200) COLLATE pg_catalog."default" NOT NULL,
    primary_topics character varying(100)[] COLLATE pg_catalog."default",
    secondary_topics character varying(100)[] COLLATE pg_catalog."default",
    hints character varying(1000)[] COLLATE pg_catalog."default",
    similar_problems character varying(500)[] COLLATE pg_catalog."default",
    deleted_at character varying(100) COLLATE pg_catalog."default",
    CONSTRAINT problems_pkey PRIMARY KEY (id),
    CONSTRAINT problems_slug_unique UNIQUE (slug)
)


TABLESPACE pg_default;


CREATE TABLE IF NOT EXISTS public.submissions
(
    id uuid NOT NULL DEFAULT uuidv7(),
    problem_id uuid NOT NULL,
    timer bigint,
    approach_score smallint,
    pass boolean,
    edge_case_score smallint,
    submitted_at character varying(30) COLLATE pg_catalog."default" NOT NULL,
    edge_cases jsonb[],
    user_input character varying(3000) COLLATE pg_catalog."default" NOT NULL,
    difficulty difficulty_enum,
    problem_rating double precision,
    hints_used character varying(1000)[] COLLATE pg_catalog."default",
    elo_diff double precision,
    missing_points character varying(4000) COLLATE pg_catalog."default",
    user_id character varying(100) COLLATE pg_catalog."default" NOT NULL,
    problem_title character varying(1000) COLLATE pg_catalog."default",
    identified_approach character varying(300) COLLATE pg_catalog."default",
    status submission_status NOT NULL,
    failure_reason character varying(5000) COLLATE pg_catalog."default",
    failed_at character varying(100) COLLATE pg_catalog."default",
    CONSTRAINT submissions_pkey PRIMARY KEY (id),
    CONSTRAINT submissions_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT submissions_problem_fk FOREIGN KEY (problem_id) REFERENCES public.problems(id)
)

TABLESPACE pg_default;


  
CREATE INDEX submissions_user_submitted_idx
      ON public.submissions (user_id, submitted_at DESC);

CREATE INDEX submissions_user_problem_idx
      ON public.submissions (user_id, problem_id);

CREATE INDEX submissions_status_idx
      ON public.submissions (status);

CREATE INDEX users_active_created_at_id_idx
      ON public.users (created_at DESC, id ASC)
      WHERE deleted_at IS NULL;

CREATE INDEX problems_active_title_id_idx
      ON public.problems (title ASC, id ASC)
      WHERE deleted_at IS NULL;
