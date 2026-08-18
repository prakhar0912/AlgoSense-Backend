import express from 'express'
import { GetSubmissionsById, UpdateUserProfile, RegisterUser, DeleteUser, FindUserbyId, SubmitSolution, UpdateConsistencyScore, UpdateUserScore } from '../../../use-cases/user/index.js'
import UserController from '../../../controllers/user.js'
import UnauthorizedError from '../../../errors/unauthorizedError.js'
import services from '../../../config/services.js'

const userDAO = new services.user.DAO()
const problemDAO = new services.problem.DAO()
const submissionDAO = new services.submission.DAO()

const userController = new UserController(
  new FindUserbyId(userDAO),
  new DeleteUser(userDAO),
  new SubmitSolution(userDAO, problemDAO, submissionDAO, services.utils.askGPT, services.problem.validators.modelResponseValidator, services.problem.validators.problemSolutionValidator),
  new UpdateConsistencyScore(userDAO),
  new UpdateUserScore(userDAO),
  new UpdateUserProfile(userDAO, services.user.validators.updateUser),
  new RegisterUser(userDAO, services.user.validators.registerValidator),
  new GetSubmissionsById(submissionDAO),

  services.user.validators.updateUser
)


export const userRegistration = (async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    let userPayload = req.auth?.extra
    if (!userPayload) {
      throw new UnauthorizedError("User isn't verified")
    }

    if (userPayload.is_new_user &&
      Number(userPayload.is_new_user) <= 1) {
      const result = await userController.newUserRegistration({
        body: {
          id: userPayload.user_id,
          email: userPayload.email,
          first_name: userPayload.name,
          created_at: new Date().toISOString(),
          email_verified: (userPayload.email_verified === true),
          role: Array.isArray(userPayload.roles) && userPayload.roles.includes("algosense-admin") ? "admin" : "user",
          email_notifications_enabled: true,
          scores: {
            initial_elo_rating: 1500,
            elo_rating: 1500,
            topic_ratings: {},
            approaches_score: 0,
            days_logged_in: [],
            consistency_score: 0,
            edge_case_score: 0,
            total_score: 0
          }
        }
      })
    }

    next()
  }
  catch (err) {
    next(err)
  }
})

export const newLogin = (async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    let userPayload = req.auth?.extra
    if (!userPayload || !userPayload.user_id) {
      throw new UnauthorizedError("User isn't verified")
    }
    await userController.updateConsistencyScores({ userId: userPayload.user_id as string })
    next()
  }
  catch (err) {
    next(err)
  }
})
