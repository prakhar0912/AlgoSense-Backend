import express, { type NextFunction, type Request, type Response } from 'express'
import services from '../../../../config/services.js'
import { GetSubmissionsById, UpdateUserProfile, RegisterUser, DeleteUser, FindUserbyId, SubmitSolution, UpdateConsistencyScore, UpdateUserScore } from '../../../../use-cases/user/index.js'
import UserController from '../../../../controllers/user.js'
import { UnauthorizedError } from '../../../../errors/index.js'
import checkPermission from '../../../utils/auth/auth0/authorization.js'

import type { AuthResult } from 'express-oauth2-jwt-bearer'
type JwtRequest = Omit<Request, 'auth'> & {
  auth?: AuthResult
}

const userDAO = new services.user.DAO()
const problemDAO = new services.problem.DAO()
const submissionDAO = new services.submission.DAO()


const userController = new UserController(
  new FindUserbyId(userDAO),
  new DeleteUser(userDAO),
  new SubmitSolution(problemDAO, services.utils.askGPT, services.problem.validators.modelResponseValidator, services.problem.validators.problemSolutionValidator),
  new UpdateConsistencyScore(),
  new UpdateUserScore(userDAO),
  new UpdateUserProfile(userDAO, services.user.validators.updateUser),
  new RegisterUser(userDAO, services.user.validators.registerValidator),
  new GetSubmissionsById(submissionDAO),

  services.user.validators.updateUser,
)

// TODO: Implement showing all submissions for user, add number of submissions to user table


const router = express.Router()


router.get('/profile', checkPermission([services.permissions.user.viewSelf]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as unknown as JwtRequest)?.auth?.payload.sub
    if (userId === undefined) {
      throw new UnauthorizedError('User ID is required')
    }

    const result = await userController.getProfile({ userId })
    res.send(result)
  } catch (err) {
    next(err)
  }
})

router.get('/submissions', checkPermission([services.permissions.user.viewSelfSubmission]), async (req: Request, res: Response, next: NextFunction) => {
  try {

    const userId = (req as unknown as JwtRequest)?.auth?.payload.sub
    if (userId === undefined) {
      throw new UnauthorizedError('User ID is required')
    }
    const { page, perPage } = req.query as unknown as { page: number; perPage: number }
    const result = await userController.getUserSubmissions({ userId, params: { page, perPage } })
    res.send(result)
  } catch (err) {
    next(err)
  }
})


router.post('/submitSolution', checkPermission([services.permissions.user.createSubmission]), async (req: Request, res: Response, next: NextFunction) => {
  try {

    const userId = (req as unknown as JwtRequest)?.auth?.payload.sub

    if (userId === undefined) {
      throw new UnauthorizedError('User ID is required')
    }
    const body = req.body
    const success = await userController.submitAnswer({ body, userId })
    res.send({ success })
  } catch (err) {
    next(err)
  }
})


router.delete('/delete', checkPermission([services.permissions.user.deleteSelf]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as unknown as JwtRequest)?.auth?.payload.sub

    if (userId === undefined) {
      throw new UnauthorizedError('User ID is required')
    }
    const success = await userController.deleteSelfUser({ userId })
    res.send({ success })
  } catch (err) {
    next(err)
  }
})

export default router
