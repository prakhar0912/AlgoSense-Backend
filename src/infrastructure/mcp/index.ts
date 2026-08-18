import z from 'zod'
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import type { AuthInfo } from '@modelcontextprotocol/server'

import UserController from '../../controllers/user.js'
import ProblemController from '../../controllers/problem.js'
import services from '../../config/services.js'
import AdminController from '../../controllers/admin.js'
import { GetProblemByIdForAdmin, GetProblemBySlugForAdmin, ListProblemsForAdmin, CreateProblem, DeleteProblem, ListUsers, RemoveUser, ToggleBanUser, UpdateUser, UpdateProblem } from '../../use-cases/admin/index.js'
import { GetProblemByIdForUser, GetProblemBySlugForUser, ListProblemsForUser } from '../../use-cases/user/index.js'
import checkPermission from '../utils/auth/auth0/authorization.js'
import { GetSubmissionsById, UpdateUserProfile, RegisterUser, DeleteUser, FindUserbyId, SubmitSolution, UpdateConsistencyScore, UpdateUserScore } from '../../use-cases/user/index.js'


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

const adminController = new AdminController(
  new ListUsers(userDAO),
  new RemoveUser(userDAO),
  new ToggleBanUser(userDAO),
  new UpdateUser(userDAO, services.user.validators.updateUserValidator),

  services.user.validators.filterUsers,
  services.user.validators.registerValidator,
)

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



function textResult(data: unknown) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(data),
    }],
  }
}

function toolError(error: unknown) {
  return {
    isError: true,
    content: [{
      type: 'text' as const,
      text: error instanceof Error ? error.message : 'Unexpected tool failure',
    }],
  }
}

function userIdFrom(authInfo: AuthInfo | undefined): string {
  const userId = authInfo?.extra?.userId

  if (typeof userId !== 'string') {
    throw new Error('Authenticated user identity is missing')
  }

  return userId
}

function requireScope(authInfo: AuthInfo | undefined, scope: string) {
  if (!authInfo?.scopes.includes(scope)) {
    throw new Error(`Missing required scope: ${scope}`)
  }
}

async function runTool<T>(operation: () => Promise<T>) {
  try {
    return textResult(await operation())
  } catch (error) {
    return toolError(error)
  }
}

export const algoSenseMcpHandler = createMcpHandler(({ authInfo }) => {
  const userId = userIdFrom(authInfo)

  const server = new McpServer({
    name: 'algosense',
    version: '1.0.0',
  })

  server.registerTool(
    'get_my_profile',
    {
      description: 'Return the authenticated AlgoSense user profile.',
      inputSchema: z.object({}),
    },
    async () => runTool(async () => {
      requireScope(authInfo, services.permissions.user.viewSelf)

      return userController.getProfile({ userId })
    }),
  )

  server.registerTool(
    'list_problems',
    {
      description: 'List problems available to the authenticated user.',
      inputSchema: z.object({
        page: z.number().int().positive().default(1),
        perPage: z.number().int().min(1).max(50).default(10),
      }),
    },
    async ({ page, perPage }) => runTool(async () => {
      requireScope(authInfo, services.permissions.user.viewPartialProblem)

      return problemController.getPaginatedProblemsForUser({
        userId,
        body: {},
        params: { page, perPage },
      })
    }),
  )

  server.registerTool(
    'get_problem_by_slug',
    {
      description: 'Get the user-safe form of an AlgoSense problem.',
      inputSchema: z.object({
        slug: z.string().min(1),
      }),
    },
    async ({ slug }) => runTool(async () => {
      requireScope(authInfo, services.permissions.user.viewPartialProblem)

      return problemController.getProblemBySlugUser({
        userId,
        params: { id: slug },
      })
    }),
  )

  server.registerTool(
    'submit_solution',
    {
      description: 'Submit a solution for scoring.',
      inputSchema: z.object({
        problem_id: z.string().min(1),
        userInput: z.string().min(1).max(20_000),
      }),
    },
    async ({ problem_id, userInput }) => runTool(async () => {
      requireScope(authInfo, services.permissions.user.createSubmission)

      return userController.submitAnswer({
        userId,
        body: { problem_id, userInput },
      })
    }),
  )

  return server
})
