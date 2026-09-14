import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from 'node:path'
import { fileURLToPath } from "node:url";

const htmlDirectory = fileURLToPath(
  new URL(
    "./src/infrastructure/mcp/outputFormatters",
    import.meta.url
  )
)

const outputDirectory = fileURLToPath(
  new URL(
    "./dist-mcp-resources/",
    import.meta.url
  )
)

export default defineConfig(({ mode }) => {
  return {
    root: htmlDirectory,
    publicDir: false,
    plugins: [viteSingleFile()],

    build: {
      outDir: outputDirectory,

      // The build script clears this directory for the first page only.
      emptyOutDir: false,

      // Each build receives one page name through `mode`.
      rolldownOptions: {
        input: resolve(htmlDirectory, `${mode}.html`),
      },
    }
  }
});
// export default defineConfig({
//   plugins: [viteSingleFile()],
//   build: {
//     outDir: "dist",
//     rollupOptions: {
//       input: "src/infrastructure/mcp/outputFormatters/submittedSolution.html",
//     },
//   },
// });
