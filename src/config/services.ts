import ProblemDAO from '../infrastructure/data-access/problemDAO.js'
import UserDAO from '../infrastructure/data-access/userDAO.js'
import SubmissionDAO from '../infrastructure/data-access/submissionDAO.js'

import * as validators from '../infrastructure/validation/zod/index.js'

import askGPT from '../infrastructure/utils/logic/askGPT.js'
import getConsistencyScore from '../infrastructure/utils/logic/getConsistencyScore.js'
import mcpNotifier from '../infrastructure/utils/notifier/mcpNotifier.js'

export default {
  user: {
    validators: validators.user,
    notifier: mcpNotifier,
    DAO: UserDAO,
  },
  problem: {
    validators: validators.problem,
    DAO: ProblemDAO,
  },
  submission: {
    DAO: SubmissionDAO,
  },
  utils: {
    askGPT,
    getConsistencyScore
  },
  permissions: {
    user: {
      viewSelf: "view:self",
      deleteSelf: "delete:self",
      updateSelf: "update:self",
      viewSelfSubmission: "view:self-submission",
      viewPartialProblem: "view:partial-problem",
      createSubmission: "create:submission",
    },
    admin: {
      viewProblem: "view:problem",
      updateProblem: "update:problem",
      createProblem: "create:problem",
      deleteProblem: "delete:problem",
      viewUser: "view:user",
      updateUser: "update:user",
      deleteUser: "delete:user",
      viewSubmission: "view:submission",
      updateSubmission: "update:submission",
      deleteSubmission: "delete:submission",
      viewSelf: "view:self",
      deleteSelf: "delete:self",
      updateSelf: "update:self",
      viewSelfSubmission: "view:self-submission",
      viewPartialProblem: "view:partial-problem",
      createSubmission: "create:submission",
    }
  },
  weights: {
    elo_k_weight: 24,
    numberOfAttemptsModifier: {
      0: 1,
      1: 0.5,
      2: 0.15,
      maxNumber: 3,
      maxValue: 0.05
    },
    totalScoreWeights: {
      approach_score: 0.45,
      edge_case_score: 0.35,
      consistency_score: 0.20
    },
    approachScoreWeights: {
      max: 100,
      optimal: 100,
      correct: 75,
      partially_correct: 50,
      incorrect: 0,
    },
    edgeCaseImportanceWeights: {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    },
    edgeCaseCoverageWeights: {
      correct: 1,
      partial: 0.6,
      incorrect: 0.2,
      missing: 0
    },
    problemDifficultyWeights: {
      easy: 20,
      medium: 40,
      hard: 75,
      expert: 100,
    }

  }
}
