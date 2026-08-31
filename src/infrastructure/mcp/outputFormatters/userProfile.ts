import { z } from "zod/v4"
z.config({ jitless: true })
const { App } = await import("@modelcontextprotocol/ext-apps");


/* =========================================================
   TYPES
   ========================================================= */

type Role =
  | "admin"
  | "user";


type Difficulty =
  | "easy"
  | "medium"
  | "hard"
  | "expert";


interface TopicRatings {
  [topic: string]: number | undefined;
}


interface UserScores {
  initial_elo_rating: number;

  elo_rating: number;

  topic_ratings: TopicRatings;

  approaches_score: number;

  days_logged_in: string[];

  consistency_score: number;

  edge_case_score: number;

  total_score: number;
}


interface Submission {
  problem_title: string;

  difficulty: Difficulty;

  timer?: number | null;

  approach_score: number;

  identified_approach: string;

  pass: boolean;

  edge_case_score: number;

  submitted_at: string;
}


interface User {
  email: string;

  first_name?: string;

  last_name?: string;

  role: Role;

  banned: boolean;

  scores?: UserScores;

  created_at: string;

  last_5_submissions?:
  | Submission[]
  | null;

  email_verified: boolean;

  email_notifications_enabled: boolean;
}


/* =========================================================
   DOM HELPERS
   ========================================================= */

function getElement<T extends HTMLElement>(
  id: string,
): T | null {
  return document.getElementById(
    id,
  ) as T | null;
}


/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeHtml(
  value: unknown,
): string {

  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;",
    )
    .replace(
      /</g,
      "&lt;",
    )
    .replace(
      />/g,
      "&gt;",
    )
    .replace(
      /"/g,
      "&quot;",
    )
    .replace(
      /'/g,
      "&#039;",
    );
}


/* =========================================================
   FORMATTING
   ========================================================= */

function formatNumber(
  value: number | undefined,
  decimals = 0,
): string {

  if (
    value === undefined ||
    value === null ||
    Number.isNaN(value)
  ) {
    return "—";
  }


  return value.toLocaleString(
    undefined,
    {
      maximumFractionDigits:
        decimals,
      minimumFractionDigits:
        decimals,
    },
  );
}


function formatDate(
  value: string,
): string {

  if (!value) {
    return "—";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }


  return date.toLocaleString(
    undefined,
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    },
  );
}


function formatTopicName(
  value: string,
): string {

  return value
    .replace(
      /([a-z])([A-Z])/g,
      "$1 $2",
    )
    .replace(
      /_/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase(),
    );
}


function formatDifficulty(
  difficulty: Difficulty,
): string {

  return (
    difficulty
      .charAt(0)
      .toUpperCase() +
    difficulty.slice(1)
  );
}


/* =========================================================
   USER NAME
   ========================================================= */

function getDisplayName(
  user: User,
): string {

  const name =
    [
      user.first_name,
      user.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();


  return (
    name ||
    user.email ||
    "User"
  );
}


/* =========================================================
   SCORE HELPERS
   ========================================================= */

function scorePercentage(
  value: number,
): number {

  return Math.max(
    0,
    Math.min(
      100,
      value,
    ),
  );
}


/* =========================================================
   RENDER PROFILE HEADER
   ========================================================= */

function renderProfile(
  user: User,
): void {

  const name =
    getDisplayName(user);


  const nameElement =
    getElement<HTMLElement>(
      "user-name",
    );


  const emailElement =
    getElement<HTMLElement>(
      "user-email",
    );


  if (nameElement) {
    nameElement.textContent =
      name;
  }


  if (emailElement) {
    emailElement.textContent =
      user.email || "No email";
  }


  /* -------------------------------------------------------
     Avatar initials
     ------------------------------------------------------- */

  const avatar =
    getElement<HTMLElement>(
      "user-avatar",
    );


  if (avatar) {

    const initials =
      [
        user.first_name?.[0],
        user.last_name?.[0],
      ]
        .filter(Boolean)
        .join("")
        .toUpperCase();


    avatar.textContent =
      initials || "👤";
  }


  /* -------------------------------------------------------
     Badges
     ------------------------------------------------------- */

  const badges =
    getElement<HTMLElement>(
      "user-badges",
    );


  if (badges) {

    badges.innerHTML = `
      <span
        class="badge ${user.role === "admin"
        ? "admin"
        : "user"
      }"
      >
        ${user.role === "admin"
        ? "🛡️ Admin"
        : "👤 User"
      }
      </span>

      <span
        class="badge ${user.banned
        ? "danger"
        : "success"
      }"
      >
        ${user.banned
        ? "🚫 Banned"
        : "✓ Active"
      }
      </span>
    `;
  }


  /* -------------------------------------------------------
     Account status
     ------------------------------------------------------- */

  const createdAt =
    getElement<HTMLElement>(
      "created-at",
    );


  if (createdAt) {
    createdAt.textContent =
      formatDate(
        user.created_at,
      );
  }


  const accountState =
    getElement<HTMLElement>(
      "account-state",
    );


  if (accountState) {

    accountState.textContent =
      user.banned
        ? "🚫 Account banned"
        : "✓ Account active";
  }
}


/* =========================================================
   RENDER PERFORMANCE
   ========================================================= */

function renderScores(
  scores?: UserScores,
): void {

  if (!scores) {
    return;
  }


  const values: Record<
    string,
    number
  > = {
    "total-score":
      scores.total_score,

    "elo-rating":
      scores.elo_rating,

    "initial-elo":
      scores.initial_elo_rating,

    "approaches-score":
      scores.approaches_score,

    "edge-case-score":
      scores.edge_case_score,

    "consistency-score":
      scores.consistency_score,
  };


  for (
    const [
      id,
      value,
    ] of Object.entries(values)
  ) {

    const element =
      getElement<HTMLElement>(
        id,
      );


    if (element) {

      element.textContent =
        formatNumber(
          value,
          1,
        );
    }
  }


  /* -------------------------------------------------------
     Total score progress
     ------------------------------------------------------- */

  const fill =
    getElement<HTMLElement>(
      "total-score-fill",
    );


  if (fill) {

    fill.style.width =
      `${scorePercentage(
        scores.total_score,
      )}%`;
  }
}


/* =========================================================
   RENDER TOPIC RATINGS
   ========================================================= */

/*
 * IMPORTANT:
 *
 * We explicitly filter out:
 *
 *   0
 *
 * and only render topics that have a non-zero value.
 *
 * Undefined/null values are also ignored.
 */

function renderTopicRatings(
  scores?: UserScores,
): void {

  const container =
    getElement<HTMLElement>(
      "topic-ratings",
    );


  const count =
    getElement<HTMLElement>(
      "topic-rating-count",
    );


  if (!container) {
    return;
  }


  if (!scores?.topic_ratings) {

    container.innerHTML = `
      <div class="empty">
        No topic ratings available.
      </div>
    `;

    if (count) {
      count.textContent = "0";
    }

    return;
  }


  const activeTopics =
    Object.entries(
      scores.topic_ratings,
    )
      .filter(
        ([
          ,
          value,
        ]) =>
          typeof value === "number" &&
          value !== 0,
      )
      .sort(
        (
          [, a],
          [, b],
        ) =>
          (b ?? 0) -
          (a ?? 0),
      );


  if (count) {
    count.textContent =
      String(
        activeTopics.length,
      );
  }


  if (!activeTopics.length) {

    container.innerHTML = `
      <div class="empty">
        No non-zero topic ratings.
      </div>
    `;

    return;
  }


  container.innerHTML =
    activeTopics
      .map(
        ([
          topic,
          rating,
        ]) => `
          <div
            class="topic-rating"
          >

            <div
              class="topic-name"
              title="${escapeHtml(
          topic,
        )}"
            >
              ${escapeHtml(
          formatTopicName(
            topic,
          ),
        )}
            </div>

            <div
              class="topic-rating-value"
            >
              ${formatNumber(
          rating,
          1,
        )}
            </div>

          </div>
        `,
      )
      .join("");
}


/* =========================================================
   RENDER LOGIN HISTORY
   ========================================================= */

function renderLoginHistory(
  scores?: UserScores,
): void {

  const container =
    getElement<HTMLElement>(
      "days-logged-in",
    );


  const count =
    getElement<HTMLElement>(
      "login-count",
    );


  if (!container) {
    return;
  }


  const days =
    scores?.days_logged_in ?? [];


  if (count) {
    count.textContent =
      String(days.length);
  }


  if (!days.length) {

    container.innerHTML = `
      <div class="empty">
        No login history available.
      </div>
    `;

    return;
  }


  container.innerHTML =
    days
      .slice()
      .reverse()
      .map(
        (date) => `
          <div class="login-day">

            <span class="login-dot"></span>

            <span>
              ${escapeHtml(
          formatDate(date),
        )}
            </span>

          </div>
        `,
      )
      .join("");
}


/* =========================================================
   RENDER SUBMISSIONS
   ========================================================= */

function renderSubmissions(
  submissions?:
    | Submission[]
    | null,
): void {

  const container =
    getElement<HTMLElement>(
      "submissions",
    );


  const count =
    getElement<HTMLElement>(
      "submission-count",
    );


  if (!container) {
    return;
  }


  const items =
    submissions ?? [];


  if (count) {
    count.textContent =
      String(items.length);
  }


  if (!items.length) {

    container.innerHTML = `
      <div class="empty">
        No recent submissions.
      </div>
    `;

    return;
  }


  container.innerHTML =
    items
      .map(
        (
          submission,
          index,
        ) =>
          renderSubmission(
            submission,
            index,
          ),
      )
      .join("");
}


/* =========================================================
   RENDER SINGLE SUBMISSION
   ========================================================= */

function renderSubmission(
  submission: Submission,
  index: number,
): string {

  const difficulty =
    formatDifficulty(
      submission.difficulty,
    );


  return `
    <details
      id="submission-${index}"
      class="submission"
    >

      <summary>

        <span class="summary-icon">
          ${submission.pass
      ? "✅"
      : "❌"
    }
        </span>


        <span
          class="submission-summary"
        >

          <span
            class="submission-title"
          >
            ${escapeHtml(
      submission.problem_title,
    )}
          </span>


          <span
            class="submission-meta"
          >

            <span>
              ${escapeHtml(
      difficulty,
    )}
            </span>

            <span>•</span>

            <span>
              ${escapeHtml(
      formatDate(
        submission.submitted_at,
      ),
    )}
            </span>

          </span>

        </span>


        <span
          class="submission-status ${submission.pass
      ? "pass"
      : "fail"
    }"
        >
          ${submission.pass
      ? "✓ Pass"
      : "✕ Fail"
    }
        </span>

      </summary>


      <div class="submission-content">

        <div class="submission-grid">

          <div class="submission-stat">

            <div class="submission-stat-label">
              Approach Score
            </div>

            <div class="submission-stat-value">
              ${formatNumber(
      submission.approach_score,
      1,
    )}
            </div>

          </div>


          <div class="submission-stat">

            <div class="submission-stat-label">
              Edge Case Score
            </div>

            <div class="submission-stat-value">
              ${formatNumber(
      submission.edge_case_score,
      1,
    )}
            </div>

          </div>


          <div class="submission-stat">

            <div class="submission-stat-label">
              Timer
            </div>

            <div class="submission-stat-value">
              ${submission.timer === null ||
      submission.timer === undefined
      ? "No timer"
      : `${submission.timer}s`
    }
            </div>

          </div>


          <div class="submission-stat">

            <div class="submission-stat-label">
              Submitted
            </div>

            <div class="submission-stat-value">
              ${escapeHtml(
      formatDate(
        submission.submitted_at,
      ),
    )}
            </div>

          </div>


          <div class="approach">

            <div class="approach-label">
              Identified Approach
            </div>

            <div class="approach-value">
              ${escapeHtml(
      submission.identified_approach ||
      "No approach identified.",
    )}
            </div>

          </div>

        </div>

      </div>

    </details>
  `;
}


/* =========================================================
   TOGGLE
   ========================================================= */

function setToggle(
  id: string,
  enabled: boolean,
): void {

  const toggle =
    getElement<HTMLElement>(
      id,
    );


  if (!toggle) {
    return;
  }


  toggle.classList.toggle(
    "on",
    enabled,
  );
}


/* =========================================================
   ACCOUNT SETTINGS
   ========================================================= */

function renderSettings(
  user: User,
): void {

  setToggle(
    "email-verified-toggle",
    user.email_verified,
  );


  setToggle(
    "email-notifications-toggle",
    user.email_notifications_enabled,
  );


  setToggle(
    "banned-toggle",
    user.banned,
  );


  const role =
    getElement<HTMLElement>(
      "role-value",
    );


  if (role) {

    role.textContent =
      user.role === "admin"
        ? "🛡️ Admin"
        : "👤 User";
  }
}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderUser(
  user: User,
): void {

  renderProfile(user);

  renderScores(
    user.scores,
  );

  renderTopicRatings(
    user.scores,
  );

  renderLoginHistory(
    user.scores,
  );

  renderSubmissions(
    user.last_5_submissions,
  );

  renderSettings(user);
}


/* =========================================================
   MCP APP
   ========================================================= */

const app = new App({
  name:
    "User Profile",
  version:
    "1.0.0",
});


/* =========================================================
   TOOL RESULT
   ========================================================= */

app.ontoolresult = (
  result,
) => {

  console.log(
    "Received user tool result:",
    result,
  );


  if (result.isError) {

    const message =
      getElement<HTMLElement>(
        "user-profile-page",
      );


    if (message) {

      message.innerHTML = `
        <div class="error">
          ⚠️ Unable to load user profile.
        </div>
      `;
    }

    return;
  }


  /*
   * The MCP tool should return the User object
   * as structuredContent.
   */
  const user =
    result.structuredContent as
    | User
    | undefined;


  if (!user) {

    const page =
      getElement<HTMLElement>(
        "user-profile-page",
      );


    if (page) {

      page.innerHTML = `
        <div class="error">
          ⚠️ No user data was returned.
        </div>
      `;
    }

    return;
  }


  renderUser(user);
};


/* =========================================================
   CONNECT APP TO HOST
   ========================================================= */

await app.connect();
