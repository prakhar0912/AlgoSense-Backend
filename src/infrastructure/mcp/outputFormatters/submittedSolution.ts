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


type SubmissionStatus =
  | "pending"
  | "evaluating"
  | "completed"
  | "failed";


interface EdgeCase {
  description: string;

  importance: Importance;

  coverage: Coverage;
}


interface Submission {
  id: string;

  problem_title: string | null;

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

  status: SubmissionStatus;
}


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


interface ToolResponse {
  result: Submission;

  prevScores:
  | UserScores
  | null
  | undefined;

  newScores: UserScores;
}


interface SubmitSolutionResponse {
  submission_id: string;
}


/* =========================================================
   DOM
   ========================================================= */

function getElement<T extends HTMLElement>(
  id: string,
): T | null {

  return document.getElementById(
    id,
  ) as T | null;
}


/* =========================================================
   ESCAPE HTML
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
   FORMATTERS
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


  const remaining =
    seconds % 60;


  if (!minutes) {
    return `${seconds}s`;
  }


  return `${minutes}m ${remaining}s`;
}


function formatTopicName(
  topic: string,
): string {

  return topic
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
      char =>
        char.toUpperCase(),
    );
}


/* =========================================================
   SUBMISSION HELPERS
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
        hint => `
            <div class="hint">

              <span>
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
        edgeCase => `
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
   COMPLETE SUBMISSION
   ========================================================= */

function isTerminalStatus(
  status: SubmissionStatus,
): boolean {

  return status === "completed" || status === "failed";
}


function getStatusCopy(
  status: SubmissionStatus,
): { title: string; description: string } {

  switch (status) {

    case "evaluating":
      return {
        title: "Your solution is being evaluated",
        description: "A worker is reviewing your approach and edge cases.",
      };

    case "completed":
      return {
        title: "Evaluation complete",
        description: "Your final result and ELO rating change are ready.",
      };

    case "failed":
      return {
        title: "Evaluation could not be completed",
        description: "Please submit your solution again.",
      };

    default:
      return {
        title: "Your solution is queued",
        description: "Waiting for an evaluation worker to pick it up.",
      };
  }
}


function formatStatus(
  status: SubmissionStatus,
): string {

  return status.charAt(0).toUpperCase() + status.slice(1);
}


function renderEvaluationStatus(
  submission: Submission,
  pollingIssue = false,
): void {

  const container = getElement<HTMLElement>("evaluation-status");

  if (!container) {
    return;
  }

  const statusSignature = `${submission.status}:${pollingIssue}`;

  if (statusSignature === lastStatusSignature) {
    return;
  }

  lastStatusSignature = statusSignature;

  const copy = getStatusCopy(submission.status);

  container.className = `evaluation-status ${submission.status}`;
  container.innerHTML = `
    <div class="status-indicator" aria-hidden="true">
      <span class="status-dot"></span>
    </div>

    <div class="status-copy">
      <div class="status-label">Evaluation status</div>
      <div class="status-title">${escapeHtml(copy.title)}</div>
      <div class="status-description">
        ${escapeHtml(
          pollingIssue
            ? "Reconnecting to the evaluation service…"
            : copy.description,
        )}
      </div>
    </div>
  `;
}


function renderLoadingSubmission(
  submission: Submission,
): string {

  return `
    <div class="render-fade-in">
      <div class="submission-header">
        <div class="status-row">
          <span class="badge status-badge ${escapeHtml(submission.status)}">
            ${escapeHtml(formatStatus(submission.status))}
          </span>

          <span class="badge difficulty ${escapeHtml(submission.difficulty)}">
            ${difficultyEmoji(submission.difficulty)}
            ${escapeHtml(formatDifficulty(submission.difficulty))}
          </span>
        </div>

        <div class="skeleton title" aria-label="Problem title loading"></div>

        <div class="problem-rating">
          <span class="star">&#9733;</span>
          Problem Rating
          <span class="skeleton rating" aria-hidden="true"></span>
        </div>

        <div class="score-grid" aria-label="Evaluation scores loading">
          <div class="score-card">
            <div class="score-label">Approach</div>
            <span class="skeleton score" aria-hidden="true"></span>
          </div>
          <div class="score-card">
            <div class="score-label">Edge Cases</div>
            <span class="skeleton score" aria-hidden="true"></span>
          </div>
          <div class="score-card">
            <div class="score-label">ELO Change</div>
            <span class="skeleton score" aria-hidden="true"></span>
          </div>
          <div class="score-card">
            <div class="score-label">Submitted</div>
            <div class="score-value">${escapeHtml(formatDate(submission.submitted_at))}</div>
          </div>
        </div>
      </div>

      <div class="details-section">
        <details>
          <summary><span class="summary-icon">&#128172;</span><span>User Input</span></summary>
          <div class="details-content">
            <div class="text-block">${escapeHtml(submission.user_input)}</div>
          </div>
        </details>
      </div>

      <div class="details-section">
        <details>
          <summary><span class="summary-icon">&#129504;</span><span>Identified Approach</span></summary>
          <div class="details-content">
            <div class="skeleton text-block" aria-label="Approach analysis loading">
              <span class="skeleton line"></span><span class="skeleton line short"></span>
            </div>
          </div>
        </details>
      </div>

      <div class="details-section">
        <details>
          <summary><span class="summary-icon">&#128161;</span><span>Hints Used</span><span class="mini-badge">${submission.hints_used.length}</span></summary>
          <div class="details-content">${renderHints(submission.hints_used)}</div>
        </details>
      </div>

      <div class="details-section">
        <details>
          <summary><span class="summary-icon">&#129514;</span><span>Edge Cases</span></summary>
          <div class="details-content">
            <div class="skeleton text-block" aria-label="Edge case analysis loading">
              <span class="skeleton line"></span><span class="skeleton line short"></span>
            </div>
          </div>
        </details>
      </div>
    </div>
  `;
}

function renderSubmission(
  submission: Submission,
): string {

  const passClass =
    submission.pass
      ? "pass"
      : "fail";


  return `
    <div class="render-fade-in">

      <!-- =============================================
           SUBMISSION HEADER
           ============================================= -->

      <div class="submission-header">

        <div class="status-row">

          <span class="badge status-badge ${escapeHtml(submission.status)}">
            ${escapeHtml(formatStatus(submission.status))}
          </span>

          <span
            class="badge ${passClass}"
          >
            ${submission.pass
      ? "✅ Passed"
      : "❌ Failed"
    }
          </span>


          <span
            class="
              badge
              difficulty
              ${escapeHtml(
      submission.difficulty,
    )}
            "
          >
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
      submission.problem_title || "Problem result",
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
                ${submission.elo_diff >= 0
      ? "green"
      : "red"
    }
              "
            >
              ${submission.elo_diff >= 0
      ? "↑ +"
      : "↓ "
    }

              ${formatNumber(
      Math.abs(
        submission.elo_diff,
      ),
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


      <!-- =============================================
           USER INPUT
           ============================================= -->

      <div class="details-section">

        <details>

          <summary>

            <span class="summary-icon">
              💬
            </span>

            <span>
              User Input
            </span>

          </summary>


          <div class="details-content">

            <div class="text-block">

              ${escapeHtml(
      submission.user_input,
    )}

            </div>

          </div>

        </details>

      </div>


      <!-- =============================================
           APPROACH
           ============================================= -->

      <div class="details-section">

        <details>

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


      <!-- =============================================
           HINTS
           ============================================= -->

      <div class="details-section">

        <details>

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


      <!-- =============================================
           MISSING POINTS
           ============================================= -->

      <div class="details-section">

        <details>

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


      <!-- =============================================
           EDGE CASES
           ============================================= -->

      <div class="details-section">

        <details>

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


      <!-- =============================================
           SUBMISSION DETAILS
           ============================================= -->

      <div class="details-section">

        <details>

          <summary>

            <span class="summary-icon">
              ℹ️
            </span>

            <span>
              Submission Details
            </span>

          </summary>


          <div class="details-content">

            <div class="score-grid">

              <div class="score-card">

                <div class="score-label">
                  Submitted
                </div>

                <div class="score-value">
                  ${escapeHtml(
      formatDate(
        submission.submitted_at,
      ),
    )}
                </div>

              </div>


              <div class="score-card">

                <div class="score-label">
                  Difficulty
                </div>

                <div class="score-value">
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


              <div class="score-card">

                <div class="score-label">
                  Problem Rating
                </div>

                <div class="score-value">
                  ${formatNumber(
      submission.problem_rating,
      1,
    )}
                </div>

              </div>


              <div class="score-card">

                <div class="score-label">
                  Elo Difference
                </div>

                <div
                  class="
                    score-value
                    ${submission.elo_diff >= 0
      ? "green"
      : "red"
    }
                  "
                >
                  ${submission.elo_diff >= 0
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

    </div>
  `;
}


/* =========================================================
   SCORE DIFFERENCE
   ========================================================= */

interface ScoreDifference {
  label: string;

  previous: number;

  current: number;

  delta: number;
}


function getDifference(
  label: string,
  previous: number,
  current: number,
): ScoreDifference | null {

  const delta =
    current - previous;


  if (
    Object.is(
      delta,
      0,
    )
  ) {
    return null;
  }


  return {
    label,
    previous,
    current,
    delta,
  };
}


/* =========================================================
   RENDER SCORE DIFFERENCE
   ========================================================= */

function renderScoreDifference(
  difference: ScoreDifference,
): string {

  const positive =
    difference.delta > 0;


  return `
    <div class="change-card">

      <div class="change-label">

        ${escapeHtml(
    difference.label,
  )}

      </div>


      <div class="change-values">

        <span class="old-value">

          ${formatNumber(
    difference.previous,
  )}

        </span>


        <span class="change-arrow">
          →
        </span>


        <span class="new-value">

          ${formatNumber(
    difference.current,
  )}

        </span>

      </div>


      <div
        class="
          delta
          ${positive
      ? "positive"
      : "negative"
    }
        "
      >

        ${positive
      ? "↑"
      : "↓"
    }

        ${positive
      ? "+"
      : ""
    }${formatNumber(
      Math.abs(
        difference.delta,
      ),
    )}

      </div>

    </div>
  `;
}


/* =========================================================
   TOPIC DIFFERENCES
   ========================================================= */

/*
 * Rules:
 *
 * 1. Ignore topics whose values did not change.
 * 2. Ignore topics where the NEW value is zero.
 * 3. Therefore:
 *
 *    old = 0, new = 1500  -> show
 *    old = 1500, new = 1510 -> show
 *    old = 1500, new = 0 -> ignore
 *    old = 0, new = 0 -> ignore
 */

interface TopicDifference {
  topic: string;

  previous: number;

  current: number;

  delta: number;
}


function getTopicDifferences(
  previous: TopicRatings,
  current: TopicRatings,
): TopicDifference[] {

  const topicNames =
    new Set([
      ...Object.keys(previous ?? {}),
      ...Object.keys(current ?? {}),
    ]);


  return Array.from(
    topicNames,
  )
    .map(
      topic => {

        const oldValue =
          previous?.[topic] ?? 0;


        const newValue =
          current?.[topic] ?? 0;


        return {
          topic,
          previous:
            oldValue,
          current:
            newValue,
          delta:
            newValue -
            oldValue,
        };
      },
    )
    .filter(
      difference => {

        /*
         * Ignore unchanged topics.
         */
        if (
          difference.delta === 0
        ) {
          return false;
        }


        /*
         * Ignore topics whose
         * NEW rating is zero.
         */
        if (
          difference.current === 0
        ) {
          return false;
        }


        return true;
      },
    )
    .sort(
      (a, b) =>
        Math.abs(b.delta) -
        Math.abs(a.delta),
    );
}


/* =========================================================
   RENDER TOPIC DIFFERENCES
   ========================================================= */

function renderTopicDifferences(
  differences: TopicDifference[],
): string {

  if (!differences.length) {

    return `
      <div class="empty">
        🧠 No topic ratings changed.
      </div>
    `;
  }


  return `
    <div class="topic-change-list">

      ${differences
      .map(
        difference => {

          const positive =
            difference.delta > 0;


          return `
              <div class="topic-change">

                <div
                  class="topic-name"
                  title="${escapeHtml(
            difference.topic,
          )}"
                >
                  ${escapeHtml(
            formatTopicName(
              difference.topic,
            ),
          )}
                </div>


                <div class="topic-values">

                  <span class="topic-old">
                    ${formatNumber(
            difference.previous,
            1,
          )}
                  </span>


                  <span>
                    →
                  </span>


                  <span class="topic-new">
                    ${formatNumber(
            difference.current,
            1,
          )}
                  </span>


                  <span
                    class="
                      topic-delta
                      ${positive
              ? "positive"
              : "negative"
            }
                    "
                  >
                    ${positive
              ? "+"
              : ""
            }${formatNumber(
              difference.delta,
              1,
            )}
                  </span>

                </div>

              </div>
            `;
        },
      )
      .join("")}

    </div>
  `;
}


/* =========================================================
   RENDER SCORE COMPARISON
   ========================================================= */

function renderScoreComparison(
  previous:
    | UserScores
    | null
    | undefined,

  current:
    UserScores,
): void {

  const container =
    getElement<HTMLElement>(
      "score-comparison",
    );


  if (!container) {
    return;
  }


  /*
   * There is no previous score to compare
   * against.
   */
  if (!previous) {

    container.innerHTML = `

      <div class="initial-elo">

        <div class="initial-elo-label">
          Initial Elo Rating
        </div>

        <div class="initial-elo-value">
          ${formatNumber(
      current.initial_elo_rating,
      1,
    )}
        </div>

      </div>


      <div class="empty">

        📈 No previous scores are available
        for comparison.

      </div>
    `;

    return;
  }


  /*
   * Initial Elo is deliberately displayed
   * exactly once.
   */
  const initialElo = `
    <div class="initial-elo">

      <div class="initial-elo-label">
        Initial Elo Rating
      </div>

      <div class="initial-elo-value">
        ${formatNumber(
    current.initial_elo_rating,
    1,
  )}
      </div>

    </div>
  `;


  /* -------------------------------------------------------
     Standard score differences
     ------------------------------------------------------- */

  const differences = [
    getDifference(
      "Elo Rating",
      previous.elo_rating,
      current.elo_rating,
    ),

    getDifference(
      "Approach Score",
      previous.approaches_score,
      current.approaches_score,
    ),

    getDifference(
      "Edge Case Score",
      previous.edge_case_score,
      current.edge_case_score,
    ),

    getDifference(
      "Total Score",
      previous.total_score,
      current.total_score,
    ),
  ].filter(
    (
      difference,
    ): difference is ScoreDifference =>
      difference !== null,
  );


  /* -------------------------------------------------------
     Topic differences
     ------------------------------------------------------- */

  const topicDifferences =
    getTopicDifferences(
      previous.topic_ratings,
      current.topic_ratings,
    );


  /* -------------------------------------------------------
     Standard score cards
     ------------------------------------------------------- */

  const scoreCards =
    differences.length
      ? `
        <div class="change-grid">

          ${differences
        .map(
          renderScoreDifference,
        )
        .join("")}

        </div>
      `
      : `
        <div class="empty">
          📊 None of the tracked scores changed.
        </div>
      `;


  /* -------------------------------------------------------
     Topic ratings
     ------------------------------------------------------- */

  const topicSection = `
    <div
      class="details-section"
      style="
        margin-top: 17px;
        border-top: 0;
      "
    >

      <details>

        <summary>

          <span class="summary-icon">
            🧠
          </span>

          <span>
            Topic Rating Changes
          </span>

          <span class="mini-badge">
            ${topicDifferences.length}
          </span>

        </summary>


        <div class="details-content">

          ${renderTopicDifferences(
    topicDifferences,
  )}

        </div>

      </details>

    </div>
  `;


  container.innerHTML = `
    ${initialElo}

    <p class="comparison-intro">

      Showing only score changes from
      the previous state to the new state.
      Unchanged values are hidden.

    </p>

    ${scoreCards}

    ${topicSection}
  `;
}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderEvaluationSummary(
  submission: Submission,
): void {

  const container = getElement<HTMLElement>("score-comparison");

  if (!container) {
    return;
  }

  if (!isTerminalStatus(submission.status)) {
    container.innerHTML = `
      <div class="elo-hero">
        <div>
          <div class="elo-hero-label">ELO rating change</div>
          <div class="elo-hero-copy">Available when the evaluation is complete.</div>
        </div>
        <span class="skeleton" style="width: 88px; height: 34px" aria-label="ELO change loading"></span>
      </div>
    `;

    return;
  }

  const positive = submission.elo_diff >= 0;
  const signedElo = `${positive ? "+" : ""}${formatNumber(submission.elo_diff)}`;

  container.innerHTML = `
    <div class="elo-hero render-fade-in">
      <div>
        <div class="elo-hero-label">ELO rating change</div>
        <div class="elo-hero-copy">Applied from this submission.</div>
      </div>
      <div class="elo-hero-value ${positive ? "green" : "red"}">
        ${escapeHtml(signedElo)}
      </div>
    </div>

    <div class="score-grid">
      <div class="score-card">
        <div class="score-label">Approach score</div>
        <div class="score-value purple">${formatNumber(submission.approach_score)}</div>
      </div>
      <div class="score-card">
        <div class="score-label">Edge case score</div>
        <div class="score-value purple">${formatNumber(submission.edge_case_score)}</div>
      </div>
      <div class="score-card">
        <div class="score-label">Result</div>
        <div class="score-value ${submission.pass ? "green" : "red"}">
          ${submission.pass ? "Passed" : "Not passed"}
        </div>
      </div>
      <div class="score-card">
        <div class="score-label">Problem rating</div>
        <div class="score-value">${formatNumber(submission.problem_rating, 0)}</div>
      </div>
    </div>
  `;
}


let lastSubmissionSignature = "";

let lastStatusSignature = "";


function renderTrackedSubmission(
  submission: Submission,
): void {

  const signature = JSON.stringify(submission);

  renderEvaluationStatus(submission);

  if (signature === lastSubmissionSignature) {
    return;
  }

  lastSubmissionSignature = signature;

  const submissionContainer = getElement<HTMLElement>("submission-container");

  if (submissionContainer) {
    submissionContainer.innerHTML = isTerminalStatus(submission.status)
      ? renderSubmission(submission)
      : renderLoadingSubmission(submission);
  }

  renderEvaluationSummary(submission);
}

function renderResponse(
  response: ToolResponse,
): void {

  renderTrackedSubmission(response.result);
}


/* =========================================================
   ERROR
   ========================================================= */

function renderError(
  message: string,
): void {

  const page =
    getElement<HTMLElement>(
      "submission-score-page",
    );


  if (!page) {
    return;
  }


  page.innerHTML = `
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


function renderInitialPollingState(): void {

  const status = getElement<HTMLElement>("evaluation-status");

  if (status) {
    status.className = "evaluation-status pending";
    status.innerHTML = `
      <div class="status-indicator" aria-hidden="true"><span class="status-dot"></span></div>
      <div class="status-copy">
        <div class="status-label">Evaluation status</div>
        <div class="status-title">Submission received</div>
        <div class="status-description">Checking the evaluation queue…</div>
      </div>
    `;
  }

  const submissionContainer = getElement<HTMLElement>("submission-container");

  if (submissionContainer) {
    submissionContainer.innerHTML = `
      <div class="submission-header">
        <div class="status-row"><span class="badge status-badge pending">Pending</span></div>
        <div class="skeleton title" aria-label="Submission details loading"></div>
        <div class="score-grid" aria-label="Evaluation details loading">
          <div class="score-card"><div class="score-label">Approach</div><span class="skeleton score"></span></div>
          <div class="score-card"><div class="score-label">Edge Cases</div><span class="skeleton score"></span></div>
          <div class="score-card"><div class="score-label">ELO Change</div><span class="skeleton score"></span></div>
          <div class="score-card"><div class="score-label">Problem Rating</div><span class="skeleton score"></span></div>
        </div>
      </div>
    `;
  }

  const scoreContainer = getElement<HTMLElement>("score-comparison");

  if (scoreContainer) {
    scoreContainer.innerHTML = `
      <div class="elo-hero">
        <div><div class="elo-hero-label">ELO rating change</div><div class="elo-hero-copy">Available when the evaluation is complete.</div></div>
        <span class="skeleton" style="width: 88px; height: 34px"></span>
      </div>
    `;
  }
}


function renderPollingTimeout(): void {

  const status = getElement<HTMLElement>("evaluation-status");

  if (status) {
    status.className = "evaluation-status failed";
    status.innerHTML = `
      <div class="status-indicator" aria-hidden="true"><span class="status-dot"></span></div>
      <div class="status-copy">
        <div class="status-label">Evaluation status</div>
        <div class="status-title">Evaluation timed out</div>
        <div class="status-description">
          Your submission was not completed within four minutes. Please try submitting it again.
        </div>
      </div>
    `;
  }

  const submissionContainer = getElement<HTMLElement>("submission-container");

  if (submissionContainer) {
    submissionContainer.innerHTML = `
      <div class="section-body render-fade-in">
        <div class="empty">
          The evaluation timed out after four minutes. Please submit your solution again.
        </div>
      </div>
    `;
  }

  const scoreContainer = getElement<HTMLElement>("score-comparison");

  if (scoreContainer) {
    scoreContainer.innerHTML = `
      <div class="empty render-fade-in">
        ELO changes are unavailable because this evaluation timed out. Please try again.
      </div>
    `;
  }
}


function isSubmitSolutionResponse(
  value: unknown,
): value is SubmitSolutionResponse {

  return typeof value === "object" && value !== null &&
    typeof (value as SubmitSolutionResponse).submission_id === "string";
}


function isSubmission(
  value: unknown,
): value is Submission {

  return typeof value === "object" && value !== null &&
    typeof (value as Submission).id === "string" &&
    typeof (value as Submission).status === "string";
}


/* =========================================================
   MCP APP
   ========================================================= */

const app = new App({
  name:
    "Submission Score Change",
  version:
    "1.0.0",
});


const POLL_INTERVAL_MS = 2_000;

const POLLING_TIMEOUT_MS = 4 * 60_000;

let activeSubmissionId: string | null = null;

let pollingDeadline: number | null = null;

let pollingTimer: number | undefined;

let pollingInFlight = false;

let latestSubmission: Submission | null = null;


function stopPolling(): void {

  if (pollingTimer !== undefined) {
    window.clearTimeout(pollingTimer);
    pollingTimer = undefined;
  }

  activeSubmissionId = null;
  pollingDeadline = null;
}


function hasPollingTimedOut(): boolean {

  return pollingDeadline !== null && Date.now() >= pollingDeadline;
}


function stopForPollingTimeout(): void {

  stopPolling();
  renderPollingTimeout();
}


function schedulePoll(
  submissionId: string,
): void {

  if (activeSubmissionId !== submissionId) {
    return;
  }

  if (hasPollingTimedOut()) {
    stopForPollingTimeout();
    return;
  }

  const remainingTime = (pollingDeadline ?? Date.now()) - Date.now();

  pollingTimer = window.setTimeout(
    () => void pollSubmission(submissionId),
    Math.min(POLL_INTERVAL_MS, remainingTime),
  );
}


async function pollSubmission(
  submissionId: string,
): Promise<void> {

  if (pollingInFlight || activeSubmissionId !== submissionId) {
    return;
  }

  if (hasPollingTimedOut()) {
    stopForPollingTimeout();
    return;
  }

  pollingInFlight = true;

  try {
    const result = await app.callServerTool({
      name: "check-submission",
      arguments: {
        submission_id: submissionId,
      },
    });

    if (activeSubmissionId !== submissionId) {
      return;
    }

    if (hasPollingTimedOut()) {
      stopForPollingTimeout();
      return;
    }

    if (result.isError || !isSubmission(result.structuredContent)) {
      throw new Error("The status check returned malformed submission data.");
    }

    latestSubmission = result.structuredContent;
    renderTrackedSubmission(latestSubmission);

    if (isTerminalStatus(latestSubmission.status)) {
      stopPolling();
      return;
    }
  } catch (error) {
    console.warn("Unable to check submission status:", error);

    if (latestSubmission) {
      renderEvaluationStatus(latestSubmission, true);
    }
  } finally {
    pollingInFlight = false;
  }

  if (activeSubmissionId === submissionId) {
    schedulePoll(submissionId);
  }
}


function beginPolling(
  submissionId: string,
): void {

  stopPolling();
  activeSubmissionId = submissionId;
  pollingDeadline = Date.now() + POLLING_TIMEOUT_MS;
  latestSubmission = null;
  lastSubmissionSignature = "";
  lastStatusSignature = "";
  renderInitialPollingState();
  void pollSubmission(submissionId);
}


/* =========================================================
   TOOL RESULT
   ========================================================= */



app.ontoolresult = (result) => {

  console.log(
    "Received submission result:",
    result,
  );


  if (result.isError) {

    renderError(
      "The tool returned an error.",
    );

    return;
  }


  const structuredContent = result.structuredContent;

  if (isSubmitSolutionResponse(structuredContent)) {
    beginPolling(structuredContent.submission_id);
    return;
  }

  if (isSubmission(structuredContent)) {
    stopPolling();
    latestSubmission = structuredContent;
    lastSubmissionSignature = "";
    lastStatusSignature = "";
    renderTrackedSubmission(structuredContent);
    return;
  }

  const response = structuredContent as ToolResponse | undefined;

  if (!response || !response.result) {

    renderError(
      "The tool did not return structured content.",
    );

    return;
  }


  renderResponse(
    response,
  );
};


window.addEventListener("pagehide", stopPolling);


/* =========================================================
   CONNECT TO MCP APP HOST
   ========================================================= */

await app.connect();
