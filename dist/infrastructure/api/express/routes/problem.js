import express from 'express';
import services from '../../../../config/services.js';
import { ListProblems, GetProblem } from '../../../../use-cases/user/index.js';
import { CreateProblem, DeleteProblem } from '../../../../use-cases/admin/index.js';
import ProblemController from '../../../../controllers/problem.js';
const problemDAO = new services.problem.DAO();
const problemController = new ProblemController(new ListProblems(problemDAO), new GetProblem(problemDAO), new CreateProblem(problemDAO, services.problem.validators.problemValidator), new DeleteProblem(problemDAO), services.problem.validators.problemValidator);
const router = express.Router();
router.get('/problems', async (req, res, next) => {
    try {
        const { page, perPage } = req.query;
        const result = await problemController.getPaginatedProblems({ params: { page, perPage } });
        res.send(result);
    }
    catch (err) {
        next(err);
    }
});
router.get('/problem/:id', async (req, res, next) => {
    try {
        if (req.params.id === undefined) {
            throw new Error('User ID is required');
        }
        const id = String(req.params.id);
        const { page, perPage } = req.query;
        const result = await problemController.getProblemById({ params: { id, page, perPage } });
        res.send(result);
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=problem.js.map