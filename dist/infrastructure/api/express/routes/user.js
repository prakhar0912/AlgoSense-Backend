import express from 'express';
import services from '../../../../config/services.js';
import { GetSubmissionsById, UpdateUserProfile, RegisterUser, DeleteUser, FindUserbyId, SubmitSolution, UpdateConsistencyScore, UpdateUserScore } from '../../../../use-cases/user/index.js';
import UserController from '../../../../controllers/user.js';
import UnauthorizedError from '../../../../errors/unauthorizedError.js';
const userDAO = new services.user.DAO();
const problemDAO = new services.problem.DAO();
const submissionDAO = new services.submission.DAO();
const userController = new UserController(new FindUserbyId(userDAO), new DeleteUser(userDAO), new SubmitSolution(userDAO, problemDAO, submissionDAO, services.utils.askGPT, services.problem.validators.modelResponseValidator, services.problem.validators.problemSolutionValidator), new UpdateConsistencyScore(userDAO, services.utils.getConsistencyScore), new UpdateUserScore(userDAO), new UpdateUserProfile(userDAO, services.user.validators.updateUser), new RegisterUser(userDAO, services.user.validators.registerValidator), new GetSubmissionsById(submissionDAO), services.user.validators.updateUser);
// TODO: Implement showing all submissions for user, add number of submissions to user table
const router = express.Router();
router.get('/profile', async (req, res, next) => {
    try {
        const userId = req.auth?.payload.sub;
        if (userId === undefined) {
            throw new UnauthorizedError('User ID is required');
        }
        const result = await userController.getProfile({ userId: "0197f96c-b278-7f64-a32f-dae3cabe1ff0" });
        res.send(result);
    }
    catch (err) {
        next(err);
    }
});
router.get('/submissions', async (req, res, next) => {
    try {
        const userId = req.auth?.payload.sub;
        if (userId === undefined) {
            throw new UnauthorizedError('User ID is required');
        }
        const { page, perPage } = req.query;
        const result = await userController.getUserSubmissions({ userId: "0197f96c-b278-7f64-a32f-dae3cabe1ff0", params: { page, perPage } });
        res.send(result);
    }
    catch (err) {
        next(err);
    }
});
router.post('/submitSolution', async (req, res, next) => {
    try {
        const userId = req.auth?.payload.sub;
        if (userId === undefined) {
            throw new UnauthorizedError('User ID is required');
        }
        const body = req.body;
        const success = await userController.submitAnswer({ body, userId: "0197f96c-b278-7f64-a32f-dae3cabe1ff0" });
        res.send({ success });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/delete', async (req, res, next) => {
    try {
        const userId = req.auth?.payload.sub;
        if (userId === undefined) {
            throw new UnauthorizedError('User ID is required');
        }
        const success = await userController.deleteSelfUser({ userId });
        res.send({ success });
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=user.js.map