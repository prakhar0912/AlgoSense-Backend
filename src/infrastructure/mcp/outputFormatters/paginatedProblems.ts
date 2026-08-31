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


interface Problem {
  title: string;

  /*
   * HTML content.
   *
   * This gets injected using innerHTML.
   */
  description: string;

  rating: number;

  slug: string;

  primary_topics: string[];

  secondary_topics: string[];

  difficulty: Difficulty;

  similar_problems: string[];
}


interface ProblemListResponse {
  data: Problem[];

  pagination: {
    page: number;
    perPage: number;
  };
}


/* =========================================================
   DIFFICULTY CONFIG
   ========================================================= */

const DIFFICULTIES: Record<
  Difficulty,
  {
    label: string;
    emoji: string;
  }
> = {
  easy: {
    label: "Easy",
    emoji: "🟢",
  },

  medium: {
    label: "Medium",
    emoji: "🟡",
  },

  hard: {
    label: "Hard",
    emoji: "🔴",
  },

  expert: {
    label: "Expert",
    emoji: "🟣",
  },
};


/* =========================================================
   MCP APP
   ========================================================= */

const app = new App({
  name: "Problem List",
  version: "1.0.0",
});


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

/*
 * Use this for normal data that we are constructing
 * into HTML ourselves.
 *
 * DO NOT use this on problem.description because
 * description is already HTML.
 */

function escapeHtml(
  value: unknown,
): string {
  return String(value)
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

function formatTopic(
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
      (char) =>
        char.toUpperCase(),
    );
}


function formatRating(
  rating: number,
): string {
  return Number.isInteger(rating)
    ? String(rating)
    : rating.toFixed(0);
}


/* =========================================================
   RENDER TOPICS
   ========================================================= */

function renderTopics(
  topics: string[] | undefined,
  secondary = false,
): string {

  if (!topics?.length) {
    return "";
  }


  return topics
    .map(
      (topic) => `
        <span
          class="topic ${secondary
          ? "secondary"
          : ""
        }"
        >
          ${escapeHtml(
          formatTopic(topic),
        )}
        </span>
      `,
    )
    .join("");
}


/* =========================================================
   RENDER SIMILAR PROBLEMS
   ========================================================= */

function renderSimilarProblems(
  problems: string[] | undefined,
): string {

  if (!problems?.length) {

    return `
      <span class="empty">
        No similar problems found.
      </span>
    `;
  }


  return problems
    .map(
      (slug) => `
        <a
          class="similar"
          href="/problems/${encodeURIComponent(
        slug,
      )}"
          data-problem-slug="${escapeHtml(
        slug,
      )}"
        >

          <span class="similar-icon">
            🔗
          </span>

          <span class="similar-slug">
            ${escapeHtml(slug)}
          </span>

        </a>
      `,
    )
    .join("");
}


/* =========================================================
   RENDER A SINGLE PROBLEM
   ========================================================= */

function renderProblem(
  problem: Problem,
  index: number,
): string {

  const difficulty =
    DIFFICULTIES[
    problem.difficulty
    ];


  const primaryTopics =
    renderTopics(
      problem.primary_topics,
    );


  const secondaryTopics =
    renderTopics(
      problem.secondary_topics,
      true,
    );


  const hasTopics =
    primaryTopics ||
    secondaryTopics;


  const similarProblems =
    problem.similar_problems ?? [];


  return `
    <article
      id="problem-card-${index}"
      class="problem-card"
      data-problem-slug="${escapeHtml(
    problem.slug,
  )}"
    >

      <!-- =============================================
           PROBLEM HEADER
           ============================================= -->

      <div class="problem-header">

        <div class="problem-meta-row">

          <span
            class="difficulty ${problem.difficulty}"
          >

            <span
              class="difficulty-dot"
            ></span>

            ${difficulty.emoji}
            ${difficulty.label}

          </span>


          <span class="rating">

            <span class="star">
              ★
            </span>

            ${formatRating(
    problem.rating,
  )}

          </span>

        </div>


        <h2 class="problem-title">

          ${escapeHtml(
    problem.title,
  )}

        </h2>


        <div class="problem-slug">

          ${escapeHtml(
    problem.slug,
  )}

        </div>


        ${hasTopics
      ? `
              <div class="topics">

                ${primaryTopics}

                ${secondaryTopics}

              </div>
            `
      : ""
    }

      </div>


      <!-- =============================================
           DESCRIPTION
           ============================================= -->

      <div class="problem-details">

        <details
          id="problem-${index}-description"
        >

          <summary>

            <span class="summary-icon">
              📝
            </span>

            <span>
              Description
            </span>

          </summary>


          <div
            id="problem-${index}-description-content"
            class="details-content description"
          >

            ${
    /*
     * IMPORTANT:
     *
     * description is trusted HTML.
     *
     * We intentionally do NOT escape it.
     */
    problem.description ?? ""
    }

          </div>

        </details>

      </div>


      <!-- =============================================
           SIMILAR PROBLEMS
           ============================================= -->

      ${similarProblems.length
      ? `
            <div class="problem-details">

              <details
                id="problem-${index}-similar"
              >

                <summary>

                  <span class="summary-icon">
                    🔗
                  </span>

                  <span>
                    Similar Problems
                  </span>

                  <span
                    class="similar-count"
                  >
                    ${similarProblems.length}
                  </span>

                </summary>


                <div class="details-content">

                  <div
                    id="problem-${index}-similar-list"
                    class="similar-list"
                  >

                    ${renderSimilarProblems(
        similarProblems,
      )}

                  </div>

                </div>

              </details>

            </div>
          `
      : ""
    }

    </article>
  `;
}


/* =========================================================
   RENDER PROBLEM LIST
   ========================================================= */

function renderProblemList(
  response: ProblemListResponse,
): void {

  const container =
    getElement<HTMLElement>(
      "problem-list",
    );


  if (!container) {
    return;
  }


  const problems =
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

  const totalPages =
    getElement<HTMLElement>(
      "total-pages",
    );

  const resultCount =
    getElement<HTMLElement>(
      "result-count",
    );


  if (currentPage) {
    currentPage.textContent =
      String(
        pagination.page,
      );
  }


  /*
   * Since the response only gives page/perPage,
   * the total number of pages is not known.
   *
   * Show the current page rather than inventing
   * a total.
   */

  if (totalPages) {
    totalPages.textContent =
      "—";
  }


  if (resultCount) {

    const start =
      (
        (pagination.page - 1) *
        pagination.perPage
      ) + 1;

    const end =
      start + problems.length - 1;


    resultCount.textContent =
      problems.length
        ? `${start}–${end}`
        : "0 results";
  }


  /* -------------------------------------------------------
     Empty state
     ------------------------------------------------------- */

  if (!problems.length) {

    container.innerHTML = `
      <div
        class="problem-card"
        style="padding: 30px; text-align: center;"
      >
        <div
          style="
            font-size: 30px;
            margin-bottom: 10px;
          "
        >
          🔍
        </div>

        <div
          style="
            color: var(--text-secondary);
            font-size: 13px;
          "
        >
          No problems found.
        </div>
      </div>
    `;

    return;
  }


  /* -------------------------------------------------------
     Render cards
     ------------------------------------------------------- */

  container.innerHTML =
    problems
      .map(
        (
          problem,
          index,
        ) =>
          renderProblem(
            problem,
            index,
          ),
      )
      .join("");
}


/* =========================================================
   ERROR STATE
   ========================================================= */

function renderError(
  message: string,
): void {

  const container =
    getElement<HTMLElement>(
      "problem-list",
    );


  if (!container) {
    return;
  }


  container.innerHTML = `
    <div class="error">

      <strong>
        ⚠️ Unable to load problems
      </strong>

      <div
        style="
          margin-top: 6px;
          opacity: 0.8;
        "
      >
        ${escapeHtml(message)}
      </div>

    </div>
  `;
}


/* =========================================================
   MCP TOOL RESULT
   ========================================================= */

app.ontoolresult = (
  result,
) => {

  console.log(
    "Received problem list result:",
    result,
  );


  if (result.isError) {

    renderError(
      "The problem service returned an error.",
    );

    return;
  }


  const response =
    result.structuredContent as
    | ProblemListResponse
    | undefined;


  if (!response) {

    renderError(
      "The tool did not return structured content.",
    );

    return;
  }


  renderProblemList(
    response,
  );
};


/* =========================================================
   CONNECT
   ========================================================= */

await app.connect();
