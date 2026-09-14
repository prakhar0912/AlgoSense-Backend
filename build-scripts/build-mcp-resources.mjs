import { fileURLToPath } from "node:url";
import { build } from "vite";

const configFile = fileURLToPath(
  new URL("../vite.config.ts",
    import.meta.url),
);

const pages = [
  "submittedSolution",
  "displayProblem",
  "paginatedProblem",
  "userProfile",
  "userSubmissions",
];

for (const [index, page] of pages.entries()) {
  await build({
    configFile,
    mode: page,
    build: {
      // Clear stale output once, then preserve preceding pages.
      emptyOutDir: index === 0,
    },
  });
}
