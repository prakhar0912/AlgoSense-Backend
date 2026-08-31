import { z } from "zod/v4"
z.config({ jitless: true })
const { App } = await import("@modelcontextprotocol/ext-apps");


/* =========================================================
   Types
   ========================================================= */

type ProblemDifficulty =
  | "easy"
  | "medium"
  | "hard"
  | "expert";

interface Problem {
  title: string;

  /*
   * IMPORTANT:
   * This is HTML, not plain text.
   */
  description: string;

  rating: number;

  slug: string;

  primary_topics: string[];

  secondary_topics: string[];

  difficulty: ProblemDifficulty;

  similar_problems: string[];
}


/* =========================================================
   Configuration
   ========================================================= */

const DIFFICULTIES: Record<
  ProblemDifficulty,
  {
    label: string;
    emoji: string;
    color: string;
  }
> = {
  easy: {
    label: "Easy",
    emoji: "🟢",
    color: "#22c55e",
  },

  medium: {
    label: "Medium",
    emoji: "🟡",
    color: "#eab308",
  },

  hard: {
    label: "Hard",
    emoji: "🔴",
    color: "#ef4444",
  },

  expert: {
    label: "Expert",
    emoji: "🟣",
    color: "#a855f7",
  },
};


/* =========================================================
   MCP App
   ========================================================= */

const app = new App({
  name: "Problem Viewer",
  version: "1.0.0",
});


/* =========================================================
   Helpers
   ========================================================= */

function getElement<T extends HTMLElement>(
  id: string,
): T | null {
  return document.getElementById(id) as T | null;
}


function formatNumber(
  value: number,
): string {
  return Number.isInteger(value)
    ? String(value)
    : Number(value).toFixed(2);
}


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


/*
 * This is ONLY needed for values that we're
 * constructing into HTML ourselves.
 *
 * We intentionally do NOT use this on
 * problem.description.
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
   Topics
   ========================================================= */

function renderTopics(
  elementId: string,
  topics: string[] | undefined,
  secondary = false,
): void {

  const element =
    getElement<HTMLDivElement>(
      elementId,
    );

  if (!element) {
    return;
  }

  const items =
    topics ?? [];


  if (!items.length) {

    element.innerHTML = `
      <span class="empty">
        No topics assigned.
      </span>
    `;

    return;
  }


  element.innerHTML =
    items
      .map(
        (topic) => `
          <span
            class="topic ${secondary
            ? "secondary"
            : ""
          }"
          >
            🏷️
            ${escapeHtml(
            formatTopic(topic),
          )}
          </span>
        `,
      )
      .join("");
}


/* =========================================================
   Similar problems
   ========================================================= */

function renderSimilarProblems(
  problems: string[] | undefined,
): void {

  const container =
    getElement<HTMLDivElement>(
      "similar-problems",
    );

  const count =
    getElement<HTMLSpanElement>(
      "similar-count",
    );


  if (!container) {
    return;
  }


  const items =
    problems ?? [];


  if (count) {
    count.textContent =
      String(items.length);
  }


  if (!items.length) {

    container.innerHTML = `
      <span class="empty">
        No similar problems found.
      </span>
    `;

    return;
  }


  container.innerHTML =
    items
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
   Render problem
   ========================================================= */

function renderProblem(
  problem: Problem,
): void {

  const difficulty =
    DIFFICULTIES[
    problem.difficulty
    ] ?? DIFFICULTIES.easy;


  /* -------------------------------------------------------
     Browser title
     ------------------------------------------------------- */

  document.title =
    problem.title;


  /* -------------------------------------------------------
     Problem title
     ------------------------------------------------------- */

  const title =
    getElement<HTMLHeadingElement>(
      "problem-title",
    );

  if (title) {
    title.textContent =
      problem.title;
  }


  /* -------------------------------------------------------
     Difficulty
     ------------------------------------------------------- */

  const difficultyLabel =
    getElement<HTMLSpanElement>(
      "problem-difficulty-label",
    );

  if (difficultyLabel) {
    difficultyLabel.textContent =
      `${difficulty.emoji} ${difficulty.label}`;
  }


  const difficultyValue =
    getElement<HTMLDivElement>(
      "problem-difficulty-value",
    );

  if (difficultyValue) {
    difficultyValue.textContent =
      `${difficulty.emoji} ${difficulty.label}`;
  }


  const difficultyDot =
    getElement<HTMLSpanElement>(
      "problem-difficulty-dot",
    );

  if (difficultyDot) {
    difficultyDot.style.background =
      difficulty.color;
  }


  /* -------------------------------------------------------
     Rating
     ------------------------------------------------------- */

  const rating =
    getElement<HTMLDivElement>(
      "problem-rating",
    );

  if (rating) {
    rating.innerHTML = `
      <span class="star">★</span>
      ${formatNumber(problem.rating)}
    `;
  }


  /* -------------------------------------------------------
     Slug
     ------------------------------------------------------- */

  const slug =
    getElement<HTMLDivElement>(
      "problem-slug",
    );

  if (slug) {
    slug.textContent =
      problem.slug;
  }


  /* -------------------------------------------------------
     DESCRIPTION
     -------------------------------------------------------

     IMPORTANT:

     Do NOT do this:

       description.textContent =
         problem.description;

     That would display the HTML tags as text.

     Do NOT do this:

       description.innerHTML =
         escapeHtml(problem.description);

     That would also destroy the markup.

     Since `description` is trusted HTML,
     inject it directly with innerHTML.
     ------------------------------------------------------- */

  const description =
    getElement<HTMLDivElement>(
      "problem-description",
    );

  if (description) {
    description.innerHTML =
      problem.description ?? "";
  }


  /* -------------------------------------------------------
     Topics
     ------------------------------------------------------- */

  renderTopics(
    "primary-topics",
    problem.primary_topics,
  );

  renderTopics(
    "secondary-topics",
    problem.secondary_topics,
    true,
  );


  /* -------------------------------------------------------
     Similar problems
     ------------------------------------------------------- */

  renderSimilarProblems(
    problem.similar_problems,
  );
}


/* =========================================================
   MCP tool result
   ========================================================= */

app.ontoolresult = (
  result,
) => {

  console.log(
    "Received tool result:",
    result,
  );


  if (result.isError) {

    console.error(
      "Tool returned an error:",
      result,
    );

    return;
  }


  const problem =
    result.structuredContent as
    | Problem
    | undefined;


  if (!problem) {

    console.error(
      "No structuredContent in tool result.",
      result,
    );

    return;
  }
  renderProblem(problem);
};


await app.connect();
