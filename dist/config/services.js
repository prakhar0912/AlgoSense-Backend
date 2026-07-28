import ProblemDAO from '../infrastructure/data-access/problemDAO.js';
import UserDAO from '../infrastructure/data-access/userDAO.js';
import SubmissionDAO from '../infrastructure/data-access/submissionDAO.js';
import * as validators from '../infrastructure/validation/zod/index.js';
import askGPT from '../infrastructure/utils/logic/askGPT.js';
import getConsistencyScore from '../infrastructure/utils/logic/getConsistencyScore.js';
export default {
    user: {
        validators: validators.user,
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
    weights: {
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
            easy: 1,
            medium: 2,
            hard: 4,
            expert: 6,
        }
    }
};
//# sourceMappingURL=services.js.map