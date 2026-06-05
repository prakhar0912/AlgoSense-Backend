import { createDefaultPreset } from "ts-jest";

/** @type {import("jest").Config} **/
export default {
  preset: "ts-jest/presets/default-esm", // Use the native ESM preset built into ts-jest
  testEnvironment: "node",
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    // Fixed regex: matches .ts, .tsx, .mts, or .cts
    '^.+\\.[m|c]?[t]sx?$': [
      'ts-jest', 
      { 
        useESM: true,
        // Forces ts-jest to respect your NodeNext settings
        diagnostics: { warnOnly: true } 
      }
    ],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
  // Resolves module imports matching TypeScript path structures
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
