import { GetSubmissionById, GetUserSubmissionsByUserId, UpdateUserProfile, RegisterUser, DeleteUser, FindUserbyId, SubmitSolution, UpdateConsistencyScore, UpdateUserScore } from '../../../use-cases/user/index.js'
import UserController from '../../../controllers/user.js'
import UnauthorizedError from '../../../errors/unauthorizedError.js'
import services from '../../../config/services.js'
import InternalServerError from '../../../errors/internalServerError.js'
import type { AuthInfo } from '@modelcontextprotocol/server';



const userDAO = new services.user.DAO()
const problemDAO = new services.problem.DAO()
const submissionDAO = new services.submission.DAO()

// const userController = new UserController(
//   new FindUserbyId(userDAO),
//   new DeleteUser(userDAO),
//   new SubmitSolution(problemDAO, services.utils.askGPT, services.problem.validators.modelResponseValidator, services.problem.validators.problemSolutionValidator),
//   new UpdateConsistencyScore(),
//   new UpdateUserScore(userDAO),
//   new UpdateUserProfile(userDAO, services.user.validators.updateUser),
//   new RegisterUser(userDAO, services.user.validators.registerValidator),
//   new GetSubmissionsById(submissionDAO),
//
//   services.user.validators.updateUser
// )
const userController = new UserController(
  new FindUserbyId(userDAO),
  new DeleteUser(userDAO),
  new SubmitSolution(problemDAO, submissionDAO, services.problem.validators.problemSolutionValidator, services.queue.evaluationQueue),
  new UpdateConsistencyScore(),
  new UpdateUserScore(userDAO),
  new UpdateUserProfile(userDAO, services.user.validators.updateUser),
  new RegisterUser(userDAO, services.user.validators.registerValidator),
  new GetSubmissionById(submissionDAO),
  new GetUserSubmissionsByUserId(submissionDAO),

  services.user.validators.updateUser,

  services.user.notifier
)

export const newUserRegistration = (async (authInfo: AuthInfo) => {
  try {
    let userPayload = authInfo.extra
    if (!userPayload) {
      throw new UnauthorizedError("User isn't verified")
    }

    if (userPayload.is_new_user &&
      Number(userPayload.is_new_user) <= 1) {
      const result = await userController.newUserRegistration({
        body: {
          id: userPayload.user_id,
          email: userPayload.email,
          first_name: userPayload.first_name,
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
  }
  catch (err) {
    throw new InternalServerError("Unable to create Algosense user.")
  }
})

export const newLogin = (async (authInfo: AuthInfo) => {
  try {
    let userPayload = authInfo.extra
    if (!userPayload || !userPayload.user_id) {
      throw new UnauthorizedError("User isn't verified")
    }
    await userController.updateConsistencyScores({ userId: userPayload.user_id as string })
  }
  catch (err) {
    throw new InternalServerError("Unable to update user activity", err)
  }
})
