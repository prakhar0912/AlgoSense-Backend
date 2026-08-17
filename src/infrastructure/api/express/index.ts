import express from 'express'
import logger from 'morgan'
import cors from 'cors'
import methodOverride from 'method-override'
import routes from './routes/index.js'
import type IError from '../../../interfaces/error.js'

import auth from '../../utils/auth/auth0/auth.js'
import services from '../../../config/services.js'
import UserController from '../../../controllers/user.js'
import { GetSubmissionsById, UpdateUserProfile, RegisterUser, DeleteUser, FindUserbyId, SubmitSolution, UpdateConsistencyScore, UpdateUserScore } from '../../../use-cases/user/index.js'
import UnauthorizedError from '../../../errors/unauthorizedError.js'

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




const app: express.Application = express()

app.use(logger('dev'))

app.use(auth)

app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    let userPayload = req.auth?.payload
    if (!userPayload) {
      throw new UnauthorizedError("User isn't verified")
    }

    if (userPayload['https://algosense.com/is_new_user'] &&
      Number(userPayload['https://algosense.com/is_new_user']) <= 1) {

      const result = await userController.newUserRegistration({
        body: {
          id: userPayload.sub,
          email: userPayload['https://algosense.com/email'],
          first_name: userPayload['https://algosense.com/name'],
          created_at: new Date().toISOString(),
          email_verified: (userPayload['https://algosense.com/email_verified'] === 'true'),
          role: Array.isArray(userPayload['https://algosense.com/roles']) && userPayload['https://algosense.com/roles'].includes("algosense-admin") ? "admin" : "user",
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

app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    let userPayload = req.auth?.payload
    if (!userPayload || !userPayload.sub) {
      throw new UnauthorizedError("User isn't verified")
    }
    await userController.updateConsistencyScores({ userId: userPayload.sub })
    next()
  }
  catch (err) {
    next(err)
  }
})



app.use(express.json())
app.use(
  cors({
    origin: '*', // Please don't do this in real-world apps
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  }),
)
app.use(express.urlencoded({ extended: false }))

// app.get('/', async (_req: express.Request, res: express.Response) => {
//   res.send({ name: 'AlgoSense API' })
// })

routes.attach(app)

app.use(/(.*)/, (req: express.Request, res: express.Response) => {
  res.status(404).send({
    error: 'NotFound',
    message: `Cannot ${req.method} ${req.baseUrl}`,
  })
})

app.use(methodOverride())
app.use((err: IError, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err)
  res.status(err.httpStatusCode || 500).json({
    error: err.name,
    message: err.message,
    details: err?.details,
    originalError: err?.originalError
  })
})

export default app
