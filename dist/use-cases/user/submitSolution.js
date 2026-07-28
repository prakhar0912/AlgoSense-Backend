import Problem from "../../entities/problem.js";
import Submission from "../../entities/submission.js";
import UserScores from "../../entities/userScores.js";
import User from "../../entities/user.js";
import InternalServerError from "../../errors/internalServerError.js";
import NotFoundError from "../../errors/notFoundError.js";
import ValidationError from "../../errors/validationError.js";
import ShortSubmission from "../../entities/shortSubmission.js";
import services from "../../config/services.js";
export default class SubmitSolution {
    userDAO;
    problemDAO;
    submissionDAO;
    askGPT;
    submissionValidator;
    userSolutionValidator;
    constructor(userDAO, problemDAO, submissionDAO, askGPT, submissionValidator, userSolutionValidator) {
        this.userDAO = userDAO;
        this.problemDAO = problemDAO;
        this.submissionDAO = submissionDAO;
        this.askGPT = askGPT;
        this.submissionValidator = submissionValidator;
        this.userSolutionValidator = userSolutionValidator;
    }
    async call(userId, userScores, last5submissions, problemId, userInput) {
        if (typeof userId !== "string" || typeof userId === "string" && userId.trim().length === 0) {
            throw new ValidationError('User ID value invalid');
        }
        if (typeof problemId !== "string" || typeof problemId === "string" && problemId.trim().length === 0) {
            throw new ValidationError('Problem ID value invalid');
        }
        let validatedUserInput;
        try {
            validatedUserInput = this.userSolutionValidator.validate(userInput);
        }
        catch (e) {
            throw new InternalServerError('Error validating user input');
        }
        if (validatedUserInput.errors && validatedUserInput.errors.length > 0 || !validatedUserInput.success || !validatedUserInput.data) {
            throw new ValidationError('User Input Invalid', validatedUserInput.errors);
        }
        let problem;
        try {
            problem = await this.problemDAO.findById(problemId);
        }
        catch (e) {
            throw new InternalServerError('Error while fetching problem from DB');
        }
        if (!problem) {
            throw new NotFoundError('Problem not found in DB');
        }
        let modelResp;
        try {
            modelResp = await this.askGPT(problem, validatedUserInput.data);
        }
        catch (e) {
            throw new InternalServerError('Error while fetching response from model', e);
        }
        console.log(modelResp);
        let validatedModelResp;
        try {
            validatedModelResp = this.submissionValidator.validate(modelResp);
        }
        catch (e) {
            throw new InternalServerError('Error while validating model response');
        }
        const { data, errors } = validatedModelResp;
        if (errors && errors.length > 0 || !data) {
            throw new InternalServerError('The model responded incorrectly', errors);
        }
        if (!data['user_explanation_identified_apporach'] || !data['user_explanation_rating'] || !data['user_explanation_pass'] || !data['missing_points_in_user_explanation'] || !data['edge_cases_missed_in_user_explanation']) {
            throw new InternalServerError('The model responded incorrectly', errors);
        }
        let validatedData = data;
        let edgeCases = [];
        problem.approaches.forEach((approach) => {
            if (typeof approach.edge_cases !== "undefined" && approach.edge_cases.length >= 1) {
                approach.edge_cases.forEach((c) => {
                    edgeCases.push({
                        approach: approach.primary_technique ? approach.primary_technique : approach.type,
                        description: c.case,
                        importance: c.importance,
                    });
                });
            }
        });
        let coveredEdgeCases = [];
        let finalEdgeCaseData = [];
        let earned = 0;
        let max = 0;
        //TODO: Add checking of identified_approach with problem data approaches to identify which edge cases to check
        for (const detectedEdgeCase of validatedData.edge_cases_missed_in_user_explanation) {
            if (coveredEdgeCases.includes(detectedEdgeCase.missed_edge_case_description)) {
                continue;
            }
            for (const edgeCase of edgeCases) {
                if (detectedEdgeCase.missed_edge_case_description == edgeCase.description && !coveredEdgeCases.includes(detectedEdgeCase.missed_edge_case_description)) {
                    let caseEarned = services.weights.edgeCaseImportanceWeights[edgeCase.importance] * services.weights.edgeCaseCoverageWeights[detectedEdgeCase.edge_case_coverage];
                    let caseMax = services.weights.edgeCaseImportanceWeights[edgeCase.importance];
                    //FIX: Why do I have to use never here
                    let edgeCaseData = {
                        coverage: detectedEdgeCase.edge_case_coverage,
                        importance: edgeCase.importance,
                        description: edgeCase.description
                    };
                    finalEdgeCaseData.push(edgeCaseData);
                    earned += caseEarned;
                    max += caseMax;
                }
            }
            coveredEdgeCases.push(detectedEdgeCase.missed_edge_case_description);
        }
        let edgeCaseScore = 100;
        console.log(earned, max);
        if (max !== 0) {
            edgeCaseScore = Math.ceil((earned / max) * 100);
        }
        let submission;
        try {
            submission = await this.submissionDAO.create({
                user_id: userId,
                problem_id: problemId,
                user_input: userInput,
                difficulty: problem.difficulty,
                approach_score: services.weights.approachScoreWeights[data['user_explanation_rating']],
                identified_approach: data.user_explanation_identified_apporach,
                pass: data.user_explanation_pass,
                missing_points: data.missing_points_in_user_explanation,
                edge_cases: finalEdgeCaseData,
                edge_case_score: edgeCaseScore,
                submitted_at: new Date().toISOString()
            });
        }
        catch (e) {
            throw new InternalServerError('Failed to add submission to database', e);
        }
        let userSubmissionsData;
        try {
            userSubmissionsData = await this.submissionDAO.viewScoresByUser(userId);
        }
        catch (e) {
            throw new InternalServerError('Failed to fetch user submissions from the database', e);
        }
        console.log(userSubmissionsData);
        let weightedScore = 0;
        let totalWeight = 0;
        let weightedEdgeScore = 0;
        for (const submission of userSubmissionsData) {
            const weight = services.weights.problemDifficultyWeights[submission.difficulty];
            weightedEdgeScore = submission.edge_case_score * weight;
            weightedScore += submission.approach_score * weight;
            totalWeight += weight;
        }
        let mergedApproachScore = Number.isNaN(weightedScore / totalWeight) ? 0 : Math.round(weightedScore / totalWeight);
        let mergedEdgeCaseScore = Number.isNaN(weightedEdgeScore / totalWeight) ? 0 : Math.round(weightedEdgeScore / totalWeight);
        let totalScore = services.weights.totalScoreWeights.approach_score * mergedApproachScore
            + services.weights.totalScoreWeights.edge_case_score * mergedEdgeCaseScore;
        if (userScores !== undefined && userScores !== null && Number.isFinite(userScores.consistency_score)) {
            totalScore += services.weights.totalScoreWeights.consistency_score * userScores?.consistency_score;
        }
        console.log(mergedEdgeCaseScore, mergedApproachScore, totalScore);
        let updatedUserScores;
        try {
            updatedUserScores = await this.userDAO.setUserScores(userId, {
                approaches_score: mergedApproachScore,
                edge_case_score: mergedEdgeCaseScore,
                total_score: totalScore
            });
        }
        catch (e) {
            throw new InternalServerError('Unable to store new Scores.');
        }
        last5submissions = last5submissions && Array.isArray(last5submissions) ? last5submissions : [];
        let newestToOldest = [...last5submissions].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
        while (newestToOldest.length > 4) {
            newestToOldest.pop();
        }
        let newShortSubmission = new ShortSubmission();
        newShortSubmission.submission_id = submission.id;
        newShortSubmission.problem_id = submission.problem_id;
        newShortSubmission.difficulty = submission.difficulty;
        newShortSubmission.timer = submission.timer ? submission.timer : null;
        newShortSubmission.approach_score = submission.approach_score;
        newShortSubmission.identified_approach = submission.identified_approach;
        newShortSubmission.pass = submission.pass;
        newShortSubmission.edge_case_score = submission.edge_case_score;
        newShortSubmission.submitted_at = submission.submitted_at;
        newestToOldest.unshift(newShortSubmission);
        let updatedShortSubmissions;
        try {
            updatedShortSubmissions = await this.userDAO.setSubmissionsInProfile(userId, newestToOldest);
        }
        catch (e) {
            throw new InternalServerError('Unable to store new Submission Data to Database.');
        }
        return submission;
    }
}
// let userInputa = `For Two Sum II, I would use the two-pointer approach because the array is already sorted.
// I would initialize one pointer at the beginning of the array and another at the end.
// Then, while the left pointer is less than the right pointer,
// I would calculate the sum of the two elements at those pointers.
// If the sum equals the target, I would return the indices.
// If the sum is smaller than the target, I would move the left pointer forward to increase the sum, and if the sum is larger than the target, I would move the right pointer backward to decrease the sum.
// Since the array is sorted, this allows us to eliminate unnecessary checks efficiently and solve the problem in O(n) time with O(1) extra space.
// This approach also handles several important edge cases like,
// pairs located at the extreme ends of the array. Additionally, in languages with fixed integer sizes, integer overflow should be considered when adding very large values. The two-pointer solution is optimal here because the sorted nature of the array enables efficient pointer movement without requiring additional data structures like a hash map.`
//
//
// import UserDAO from "../../infrastructure/data-access/userDAO.js";
// import ProblemDAO from "../../infrastructure/data-access/problemDAO.js";
// import SubmissionDAO from "../../infrastructure/data-access/submissionDAO.js";
// import askGPT from "../../infrastructure/utils/logic/askGPT.js";
// import modelResponseValidator from "../../infrastructure/validation/zod/problem/modelResponseValidator.js";
// import problemSolutionValidator from "../../infrastructure/validation/zod/problem/problemSolution.js";
//
//
// import CreateProblem from "../admin/createProblem.js";
// import problemValidator from "../../infrastructure/validation/zod/problem/validateProblem.js";
//
// let crea = new CreateProblem(
//   new ProblemDAO(),
//   problemValidator
// )
//
//
//
// const a = new SubmitSolution(
//   new UserDAO(),
//   new ProblemDAO(),
//   new SubmissionDAO(),
//   askGPT,
//   modelResponseValidator,
//   problemSolutionValidator
// )
//# sourceMappingURL=submitSolution.js.map