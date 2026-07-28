import express from 'express';
import services from '../../../../config/services.js';
import AdminController from '../../../../controllers/admin.js';
import { CreateProblem, DeleteProblem, ListUsers, RemoveUser, ToggleBanUser, UpdateUser } from '../../../../use-cases/admin/index.js';
import { ListProblems, GetProblem } from '../../../../use-cases/user/index.js';
import ProblemController from '../../../../controllers/problem.js';
// TODO: Implement seeing submissions of a user
const userDAO = new services.user.DAO();
const problemDAO = new services.problem.DAO();
const adminController = new AdminController(new ListUsers(userDAO), new RemoveUser(userDAO), new ToggleBanUser(userDAO), new UpdateUser(userDAO, services.user.validators.updateUserValidator), services.user.validators.filterUsers, services.user.validators.registerValidator);
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
router.post('/problem/create', async (req, res, next) => {
    const result = await problemController.addProblem({ body: req.body });
    res.send(result);
});
router.delete('/problem/:id', async (req, res, next) => {
    try {
        if (req.params.id === undefined) {
            throw new Error('Problem ID is required');
        }
        const id = String(req.params.id);
        const success = await problemController.deleteProblemById({ params: { id } });
        res.send({ success });
    }
    catch (err) {
        next(err);
    }
});
router.get('/users', async (req, res, next) => {
    const { page, perPage } = req.query;
    const result = await adminController.listFilteredUsers({ params: { page, perPage }, body: req.body });
    res.send(result);
});
router.put('/users/:id', async (req, res, next) => {
    try {
        if (req.params.id === undefined) {
            throw new Error('User ID is required');
        }
        const id = String(req.params.id);
        const body = req.body;
        const success = await adminController.updateUserById({ body, params: { id } });
        res.send({ success });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/users/:id', async (req, res, next) => {
    try {
        if (req.params.id === undefined) {
            throw new Error('User ID is required');
        }
        const id = String(req.params.id);
        const success = await adminController.deleteUser({ params: { id } });
        res.send({ success });
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=admin.js.map