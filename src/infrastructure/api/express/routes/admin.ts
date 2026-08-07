import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import services from '../../../../config/services.js'
import AdminController from '../../../../controllers/admin.js'
import { CreateProblem, DeleteProblem, ListUsers, RemoveUser, ToggleBanUser, UpdateUser } from '../../../../use-cases/admin/index.js'
import { ListProblems, GetProblem } from '../../../../use-cases/user/index.js'
import ProblemController from '../../../../controllers/problem.js'
import UnauthorizedError from '../../../../errors/unauthorizedError.js'

// TODO: Implement seeing submissions of a user

const userDAO = new services.user.DAO()
const problemDAO = new services.problem.DAO()


const adminController = new AdminController(
  new ListUsers(userDAO),
  new RemoveUser(userDAO),
  new ToggleBanUser(userDAO),
  new UpdateUser(userDAO, services.user.validators.updateUserValidator),

  services.user.validators.filterUsers,
  services.user.validators.registerValidator,
)

const problemController = new ProblemController(
  new ListProblems(problemDAO),
  new GetProblem(problemDAO),
  new CreateProblem(problemDAO, services.problem.validators.problemValidator),
  new DeleteProblem(problemDAO),

  services.problem.validators.problemValidator,
)

const router = express.Router()

router.get('/problems', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.payload.sub
    if (userId === undefined) {
      throw new UnauthorizedError('User ID is required')
    }
    const { page, perPage } = req.query as unknown as { page: number; perPage: number }
    const result = await problemController.getPaginatedProblems({ userId, params: { page, perPage } })
    res.send(result)
  } catch (err) {
    next(err)
  }
})


router.get('/problem/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.payload.sub
    if (userId === undefined) {
      throw new UnauthorizedError('User ID is required')
    }
    if (req.params.id === undefined) {
      throw new Error('User ID is required')
    }
    const id = String(req.params.id)
    const { page, perPage } = req.query as unknown as { page: number; perPage: number }
    const result = await problemController.getProblemById({ userId, params: { id, page, perPage } })
    res.send(result)
  } catch (err) {
    next(err)
  }
})

router.post('/problem/create', async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.auth?.payload.sub
  if (userId === undefined) {
    throw new UnauthorizedError('User ID is required')
  }
  const result = await problemController.addProblem({ userId, body: req.body })
  res.send(result)
})

router.delete('/problem/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.payload.sub
    if (userId === undefined) {
      throw new UnauthorizedError('User ID is required')
    }
    if (req.params.id === undefined) {
      throw new Error('Problem ID is required')
    }
    const id = String(req.params.id)
    const success = await problemController.deleteProblemById({ userId, params: { id } })
    res.send({ success })
  } catch (err) {
    next(err)
  }
})


router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.auth?.payload.sub
  if (userId === undefined) {
    throw new UnauthorizedError('User ID is required')
  }
  const { page, perPage } = req.query as unknown as { page: number; perPage: number }
  const result = await adminController.listFilteredUsers({ userId, params: { page, perPage }, body: req.body })
  res.send(result)
})

router.put('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.payload.sub
    if (userId === undefined) {
      throw new UnauthorizedError('User ID is required')
    }
    if (req.params.id === undefined) {
      throw new Error('User ID is required')
    }
    const id = String(req.params.id)
    const body = req.body
    const success = await adminController.updateUserById({ userId, body, params: { id } })
    res.send({ success })
  } catch (err) {
    next(err)
  }
})

router.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.payload.sub
    if (userId === undefined) {
      throw new UnauthorizedError('User ID is required')
    }
    if (req.params.id === undefined) {
      throw new Error('User ID is required')
    }
    const id = String(req.params.id)
    const success = await adminController.deleteUser({ userId, params: { id } })
    res.send({ success })
  } catch (err) {
    next(err)
  }
})

export default router
