import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import services from '../../../../config/services.js'
import { GetProblemByIdForAdmin, GetProblemBySlugForAdmin, ListProblemsForAdmin, CreateProblem, DeleteProblem, UpdateProblem } from '../../../../use-cases/admin/index.js'
import { GetProblemByIdForUser, GetProblemBySlugForUser, ListProblemsForUser } from '../../../../use-cases/user/index.js'
import ProblemController from '../../../../controllers/problem.js'
import { UnauthorizedError } from 'express-oauth2-jwt-bearer'
import type { AuthResult } from 'express-oauth2-jwt-bearer'
type JwtRequest = Omit<Request, 'auth'> & {
  auth?: AuthResult
}

const problemDAO = new services.problem.DAO()


const problemController = new ProblemController(
  new ListProblemsForAdmin(problemDAO),
  new ListProblemsForUser(problemDAO),
  new GetProblemByIdForUser(problemDAO),
  new GetProblemByIdForAdmin(problemDAO),
  new GetProblemBySlugForUser(problemDAO),
  new GetProblemBySlugForAdmin(problemDAO),
  new CreateProblem(problemDAO, services.problem.validators.problemValidator),
  new DeleteProblem(problemDAO),
  new UpdateProblem(problemDAO, services.problem.validators.updateProblemValidatorForAdmin),

  services.problem.validators.problemValidator,
  services.problem.validators.updateProblemValidatorForAdmin,
  services.problem.validators.filterProblemsForUser
)


const router = express.Router()



router.get('/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as unknown as JwtRequest)?.auth?.payload.sub

    if (userId === undefined) {
      throw new UnauthorizedError('User ID is required')
    }
    if (typeof req.body === 'undefined') {
      req.body = {}
    }
    const { page, perPage } = req.query as unknown as { page: number; perPage: number }
    const result = await problemController.getPaginatedProblemsForUser({ userId, params: { page, perPage }, body: req.body })
    res.send(result)
  } catch (err) {
    next(err)
  }
})


router.get('/byId/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as unknown as JwtRequest)?.auth?.payload.sub
    if (userId === undefined) {
      throw new UnauthorizedError('User ID is required')
    }
    if (req.params.id === undefined) {
      throw new Error('User ID is required')
    }
    const id = String(req.params.id)
    const { page, perPage } = req.query as unknown as { page: number; perPage: number }
    const result = await problemController.getProblemByIdUser({ userId, params: { id, page, perPage } })
    res.send(result)
  } catch (err) {
    next(err)
  }
})

router.get('/bySlug/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as unknown as JwtRequest)?.auth?.payload.sub

    if (userId === undefined) {
      throw new UnauthorizedError('User ID is required')
    }
    if (req.params.slug === undefined) {
      throw new Error('User ID is required')
    }
    const id = String(req.params.slug)
    const { page, perPage } = req.query as unknown as { page: number; perPage: number }
    const result = await problemController.getProblemBySlugUser({ userId, params: { id, page, perPage } })
    res.send(result)
  } catch (err) {
    next(err)
  }
})


export default router
