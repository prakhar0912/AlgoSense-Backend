
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import services from '../../../../config/services.js'

import { ListProblems, GetProblem } from '../../../../use-cases/user/index.js'
import { CreateProblem, DeleteProblem } from '../../../../use-cases/admin/index.js'
import ProblemController from '../../../../controllers/problem.js'
import { UnauthorizedError } from 'express-oauth2-jwt-bearer'




const problemDAO = new services.problem.DAO()

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

export default router
