import { z } from "zod/v4"
z.config({ jitless: true })
const { App } = await import("@modelcontextprotocol/ext-apps");


/* =========================================================
   TYPES
   ========================================================= */

type Difficulty =
  | "easy"
  | "medium"
  | "hard"
  | "expert";


type Importance =
  | "critical"
  | "high"
  | "medium"
  | "low";


type Coverage =
  | "correct"
  | "partial"
  | "incorrect"
  | "missing";


interface EdgeCase {
  description: string;
  importance: Importance;
  coverage: Coverage;
}


interface Submission {
  problem_title: string;

  difficulty: Difficulty;

  problem_rating: number;

  user_input: string;

  hints_used: string[];

  timer?: number | null;

  approach_score: number;

  identified_approach: string;

  pass: boolean;

  missing_points: string;

  edge_cases: EdgeCase[];

  edge_case_score: number;

  submitted_at: string;

  elo_diff: number;
}


interface SubmissionResponse {
  data: Submission[];

  pagination: {
    page: number;
    perPage: number;
  };
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
  decimals = 1,
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


function formatDifficulty(
  difficulty: Difficulty,
): string {

  return (
    difficulty.charAt(0)
      .toUpperCase() +
    difficulty.slice(1)
  );
}


function difficultyEmoji(
  difficulty: Difficulty,
): string {

  switch (difficulty) {

    case "easy":
      return "🟢";

    case "medium":
      return "🟡";

    case "hard":
      return "🔴";

    case "expert":
      return "🟣";

    default:
      return "⚪";
  }
}


function formatTimer(
  timer?: number | null,
): string {

  if (
    timer === null ||
    timer === undefined
  ) {
    return "No timer";
  }


  const seconds =
    Math.max(
      0,
      Math.floor(timer),
    );


  const minutes =
    Math.floor(
      seconds / 60,
    );


  const remainingSeconds =
    seconds % 60;


  if (!minutes) {
    return `${seconds}s`;
  }


  return `${minutes}m ${remainingSeconds}s`;
}


/* =========================================================
   RENDER HINTS
   ========================================================= */

function renderHints(
  hints: string[],
): string {

  if (!hints.length) {

    return `
      <div class="empty">
        💡 No hints were used.
      </div>
    `;
  }


  return `
    <div class="hints">

      ${hints
      .map(
        (hint) => `
            <div class="hint">

              <span class="hint-icon">
                💡
              </span>

              <span>
                ${escapeHtml(hint)}
              </span>

            </div>
          `,
      )
      .join("")}

    </div>
  `;
}


/* =========================================================
   RENDER EDGE CASES
   ========================================================= */

function renderEdgeCases(
  edgeCases: EdgeCase[],
): string {

  if (!edgeCases.length) {

    return `
      <div class="empty">
        🧪 No edge cases were identified.
      </div>
    `;
  }


  return `
    <div class="edge-case-list">

      ${edgeCases
      .map(
        (edgeCase) => `
            <div class="edge-case">

              <div class="edge-case-top">

                <div class="edge-case-description">
                  ${escapeHtml(
          edgeCase.description,
        )}
                </div>


                <div class="edge-case-badges">

                  <span
                    class="
                      mini-badge
                      importance-${escapeHtml(
          edgeCase.importance,
        )}
                    "
                  >
                    ${escapeHtml(
          edgeCase.importance,
        )}
                  </span>


                  <span
                    class="
                      mini-badge
                      coverage-${escapeHtml(
          edgeCase.coverage,
        )}
                    "
                  >
                    ${escapeHtml(
          edgeCase.coverage,
        )}
                  </span>

                </div>

              </div>

            </div>
          `,
      )
      .join("")}

    </div>
  `;
}


/* =========================================================
   RENDER A SINGLE SUBMISSION
   ========================================================= */

function renderSubmission(
  submission: Submission,
  index: number,
): string {

  const eloPositive =
    submission.elo_diff >= 0;


  const passClass =
    submission.pass
      ? "pass"
      : "fail";


  const passLabel =
    submission.pass
      ? "✓ Passed"
      : "✕ Failed";


  return `
    <article
      id="submission-${index}"
      class="submission-card"
    >

      <!-- ===============================================
           HEADER
           =============================================== -->

      <div class="submission-header">

        <div class="status-row">

          <span
            class="status ${passClass}"
          >
            ${submission.pass
      ? "✅"
      : "❌"
    }

            ${passLabel}
          </span>


          <span
            class="
              difficulty
              ${escapeHtml(
      submission.difficulty,
    )}
          ">

            ${difficultyEmoji(
      submission.difficulty,
    )}

            ${escapeHtml(
      formatDifficulty(
        submission.difficulty,
      ),
    )}

          </span>

        </div>


        <h2 class="problem-title">

          ${escapeHtml(
      submission.problem_title,
    )}

        </h2>


        <div class="problem-rating">

          <span class="star">
            ★
          </span>

          Problem Rating

          <strong>
            ${formatNumber(
      submission.problem_rating,
      0,
    )}
          </strong>

        </div>


        <!-- =============================================
             SCORE GRID
             ============================================= -->

        <div class="score-grid">

          <div class="score-card">

            <div class="score-label">
              Approach
            </div>

            <div class="score-value purple">
              ${formatNumber(
      submission.approach_score,
    )}
            </div>

          </div>


          <div class="score-card">

            <div class="score-label">
              Edge Cases
            </div>

            <div class="score-value purple">
              ${formatNumber(
      submission.edge_case_score,
    )}
            </div>

          </div>


          <div class="score-card">

            <div class="score-label">
              Elo Change
            </div>

            <div
              class="
                score-value
                elo
                ${eloPositive
      ? "positive"
      : "negative"
    }
              "
            >
              ${eloPositive
      ? "↑"
      : "↓"
    }

              ${eloPositive
      ? "+"
      : ""
    }${formatNumber(
      submission.elo_diff,
    )}
            </div>

          </div>


          <div class="score-card">

            <div class="score-label">
              Timer
            </div>

            <div class="score-value">
              ${escapeHtml(
      formatTimer(
        submission.timer,
      ),
    )}
            </div>

          </div>

        </div>

      </div>


      <!-- ===============================================
           USER INPUT
           =============================================== -->

      <div class="details-section">

        <details
          id="submission-${index}-input"
        >

          <summary>

            <span class="summary-icon">
              💬
            </span>

            <span>
              User Input
            </span>

          </summary>


          <div class="details-content">

            <div
              class="
                text-block
                user-input
              "
            >
              ${escapeHtml(
      submission.user_input,
    )}
            </div>

          </div>

        </details>

      </div>


      <!-- ===============================================
           APPROACH
           =============================================== -->

      <div class="details-section">

        <details
          id="submission-${index}-approach"
        >

          <summary>

            <span class="summary-icon">
              🧠
            </span>

            <span>
              Identified Approach
            </span>

          </summary>


          <div class="details-content">

            <div class="approach-card">

              <div class="approach-label">
                Approach
              </div>

              <div class="approach-value">

                ${escapeHtml(
      submission
        .identified_approach ||
      "No approach identified.",
    )
    }

              </div>

            </div>

          </div>

        </details>

      </div>


      <!-- ===============================================
           HINTS
           =============================================== -->

      <div class="details-section">

        <details
          id="submission-${index}-hints"
        >

          <summary>

            <span class="summary-icon">
              💡
            </span>

            <span>
              Hints Used
            </span>

            <span class="mini-badge">
              ${submission.hints_used.length}
            </span>

          </summary>


          <div class="details-content">

            ${renderHints(
      submission.hints_used,
    )}

          </div>

        </details>

      </div>


      <!-- ===============================================
           MISSING POINTS
           =============================================== -->

      <div class="details-section">

        <details
          id="submission-${index}-missing"
        >

          <summary>

            <span class="summary-icon">
              ⚠️
            </span>

            <span>
              Missing Points
            </span>

          </summary>


          <div class="details-content">

            <div class="text-block">

              ${escapeHtml(
      submission.missing_points ||
      "No missing points identified.",
    )}

            </div>

          </div>

        </details>

      </div>


      <!-- ===============================================
           EDGE CASES
           =============================================== -->

      <div class="details-section">

        <details
          id="submission-${index}-edge-cases"
        >

          <summary>

            <span class="summary-icon">
              🧪
            </span>

            <span>
              Edge Cases
            </span>

            <span class="mini-badge">
              ${submission.edge_cases.length}
            </span>

          </summary>


          <div class="details-content">

            ${renderEdgeCases(
      submission.edge_cases,
    )}

          </div>

        </details>

      </div>


      <!-- ===============================================
           SUBMISSION META
           =============================================== -->

      <div class="details-section">

        <details
          id="submission-${index}-details"
        >

          <summary>

            <span class="summary-icon">
              ℹ️
            </span>

            <span>
              Submission Details
            </span>

          </summary>


          <div class="details-content">

            <div class="submission-meta">

              <div class="meta-card">

                <div class="meta-label">
                  Submitted
                </div>

                <div class="meta-value">
                  ${escapeHtml(
      formatDate(
        submission.submitted_at,
      ),
    )}
                </div>

              </div>


              <div class="meta-card">

                <div class="meta-label">
                  Difficulty
                </div>

                <div class="meta-value">
                  ${difficultyEmoji(
      submission.difficulty,
    )}

                  ${escapeHtml(
      formatDifficulty(
        submission.difficulty,
      ),
    )}
                </div>

              </div>


              <div class="meta-card">

                <div class="meta-label">
                  Problem Rating
                </div>

                <div class="meta-value">
                  ⭐ ${formatNumber(
      submission.problem_rating,
      1,
    )}
                </div>

              </div>


              <div class="meta-card">

                <div class="meta-label">
                  Elo Difference
                </div>

                <div
                  class="
                    meta-value
                    ${eloPositive
      ? "elo positive"
      : "elo negative"
    }
                  "
                >
                  ${eloPositive
      ? "+"
      : ""
    }${formatNumber(
      submission.elo_diff,
    )}
                </div>

              </div>

            </div>

          </div>

        </details>

      </div>

    </article>
  `;
}


/* =========================================================
   RENDER RESPONSE
   ========================================================= */

function renderResponse(
  response: SubmissionResponse,
): void {

  const container =
    getElement<HTMLElement>(
      "submission-list",
    );


  if (!container) {
    return;
  }


  const submissions =
    response.data ?? [];


  const pagination =
    response.pagination;


  /* -------------------------------------------------------
     Pagination
     ------------------------------------------------------- */

  const currentPage =
    getElement<HTMLElement>(
      "current-page",
    );


  if (currentPage) {
    currentPage.textContent =
      String(
        pagination.page,
      );
  }


  const range =
    getElement<HTMLElement>(
      "submission-range",
    );


  if (range) {

    if (!submissions.length) {

      range.textContent =
        "0 submissions";

    } else {

      const start =
        (
          (pagination.page - 1) *
          pagination.perPage
        ) + 1;


      const end =
        start +
        submissions.length -
        1;


      range.textContent =
        `${start}–${end}`;
    }
  }


  /* -------------------------------------------------------
     Empty state
     ------------------------------------------------------- */

  if (!submissions.length) {

    container.innerHTML = `
      <div class="loading">

        🔍

        <div
          style="
            margin-top: 8px;
          "
        >
          No submissions found.
        </div>

      </div>
    `;

    return;
  }


  /* -------------------------------------------------------
     Render submissions
     ------------------------------------------------------- */

  container.innerHTML =
    submissions
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
   ERROR
   ========================================================= */

function renderError(
  message: string,
): void {

  const container =
    getElement<HTMLElement>(
      "submission-list",
    );


  if (!container) {
    return;
  }


  container.innerHTML = `
    <div class="error">

      ⚠️

      <div
        style="
          margin-top: 8px;
        "
      >
        ${escapeHtml(message)}
      </div>

    </div>
  `;
}


/* =========================================================
   MCP APP
   ========================================================= */

const app = new App({
  name:
    "Submission History",
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
    "Received submission result:",
    result,
  );


  if (result.isError) {

    renderError(
      "The submission tool returned an error.",
    );

    return;
  }


  /*
   * Expected:
   *
   * result.structuredContent = {
   *   data: Submission[],
   *   pagination: {
   *     page: number,
   *     perPage: number
   *   }
   * }
   */

  const response =
    result.structuredContent as
    | SubmissionResponse
    | undefined;


  if (!response) {

    renderError(
      "The tool did not return structured content.",
    );

    return;
  }


  renderResponse(
    response,
  );
};


/* =========================================================
   CONNECT TO MCP APP HOST
   ========================================================= */

await app.connect();
