// import z from 'zod'
// import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
// import type { AuthInfo } from '@modelcontextprotocol/server'
//
// import UserController from '../../controllers/user.js'
// import ProblemController from '../../controllers/problem.js'
// import services from '../../config/services.js'
// import AdminController from '../../controllers/admin.js'
// import { GetProblemByIdForAdmin, GetProblemBySlugForAdmin, ListProblemsForAdmin, CreateProblem, DeleteProblem, ListUsers, RemoveUser, ToggleBanUser, UpdateUser, UpdateProblem } from '../../use-cases/admin/index.js'
// import { GetProblemByIdForUser, GetProblemBySlugForUser, ListProblemsForUser } from '../../use-cases/user/index.js'
// import checkPermission from '../utils/auth/auth0/authorization.js'
// import { GetSubmissionsById, UpdateUserProfile, RegisterUser, DeleteUser, FindUserbyId, SubmitSolution, UpdateConsistencyScore, UpdateUserScore } from '../../use-cases/user/index.js'
// import UnauthorizedError from '../../errors/unauthorizedError.js'
//
//
// const userDAO = new services.user.DAO()
// const problemDAO = new services.problem.DAO()
// const submissionDAO = new services.submission.DAO()
//
//
// const userController = new UserController(
//   new FindUserbyId(userDAO),
//   new DeleteUser(userDAO),
//   new SubmitSolution(userDAO, problemDAO, submissionDAO, services.utils.askGPT, services.problem.validators.modelResponseValidator, services.problem.validators.problemSolutionValidator),
//   new UpdateConsistencyScore(userDAO),
//   new UpdateUserScore(userDAO),
//   new UpdateUserProfile(userDAO, services.user.validators.updateUser),
//   new RegisterUser(userDAO, services.user.validators.registerValidator),
//   new GetSubmissionsById(submissionDAO),
//
//   services.user.validators.updateUser
// )
//
// const adminController = new AdminController(
//   new ListUsers(userDAO),
//   new RemoveUser(userDAO),
//   new ToggleBanUser(userDAO),
//   new UpdateUser(userDAO, services.user.validators.updateUserValidator),
//
//   services.user.validators.filterUsers,
//   services.user.validators.registerValidator,
// )
//
// const problemController = new ProblemController(
//   new ListProblemsForAdmin(problemDAO),
//   new ListProblemsForUser(problemDAO),
//   new GetProblemByIdForUser(problemDAO),
//   new GetProblemByIdForAdmin(problemDAO),
//   new GetProblemBySlugForUser(problemDAO),
//   new GetProblemBySlugForAdmin(problemDAO),
//   new CreateProblem(problemDAO, services.problem.validators.problemValidator),
//   new DeleteProblem(problemDAO),
//   new UpdateProblem(problemDAO, services.problem.validators.updateProblemValidatorForAdmin),
//
//   services.problem.validators.problemValidator,
//   services.problem.validators.updateProblemValidatorForAdmin,
//   services.problem.validators.filterProblemsForUser
// )
//
//
//
// function textResult(data: unknown) {
//   return {
//     content: [{
//       type: 'text' as const,
//       text: JSON.stringify(data),
//     }],
//   }
// }
//
// function toolError(error: unknown) {
//   return {
//     isError: true,
//     content: [{
//       type: 'text' as const,
//       text: error instanceof Error ? error.message : 'Unexpected tool failure',
//     }],
//   }
// }
//
// function userIdFrom(authInfo: AuthInfo | undefined): string {
//   const userId = authInfo?.extra?.userId
//
//   if (typeof userId !== 'string') {
//     throw new Error('Authenticated user identity is missing')
//   }
//
//   return userId
// }
//
// function requireScope(authInfo: AuthInfo | undefined, scope: string) {
//   if (!authInfo?.scopes.includes(scope)) {
//     throw new UnauthorizedError(`Missing required scope: ${scope}`)
//   }
// }
//
// async function runTool<T>(operation: () => Promise<T>) {
//   try {
//     return textResult(await operation())
//   } catch (error) {
//     return toolError(error)
//   }
// }
//
// export const algoSenseMcpHandler = createMcpHandler(({ authInfo }) => {
//   const userId = userIdFrom(authInfo)
//
//   const server = new McpServer({
//     name: 'AlgoSense',
//     version: '1.0.0',
//   })
//
//   server.registerTool(
//     'get_my_profile',
//     {
//       description: 'Return the authenticated AlgoSense user profile.',
//       inputSchema: z.object({}),
//     },
//     async () => runTool(async () => {
//       requireScope(authInfo, services.permissions.user.viewSelf)
//       return userController.getProfile({ userId })
//     }),
//   )
//
//   server.registerTool(
//     'list_problems',
//     {
//       description: 'List problems available to the authenticated user.',
//       inputSchema: z.object({
//         page: z.number().int().positive().default(1),
//         perPage: z.number().int().min(1).max(50).default(10),
//       }),
//     },
//     async ({ page, perPage }) => runTool(async () => {
//       requireScope(authInfo, services.permissions.user.viewPartialProblem)
//
//       return problemController.getPaginatedProblemsForUser({
//         userId,
//         body: {},
//         params: { page, perPage },
//       })
//     }),
//   )
//
//   server.registerTool(
//     'get_problem_by_slug',
//     {
//       description: 'Get the user-safe form of an AlgoSense problem.',
//       inputSchema: z.object({
//         slug: z.string().min(1),
//       }),
//     },
//     async ({ slug }) => runTool(async () => {
//       requireScope(authInfo, services.permissions.user.viewPartialProblem)
//
//       return problemController.getProblemBySlugUser({
//         userId,
//         params: { id: slug },
//       })
//     }),
//   )
//
//   server.registerTool(
//     'submit_solution',
//     {
//       description: 'Submit a solution for scoring.',
//       inputSchema: z.object({
//         problem_id: z.string().min(1),
//         userInput: z.string().min(1).max(20_000),
//       }),
//     },
//     async ({ problem_id, userInput }) => runTool(async () => {
//       requireScope(authInfo, services.permissions.user.createSubmission)
//
//       return userController.submitAnswer({
//         userId,
//         body: { problem_id, userInput },
//       })
//     }),
//   )
//
//   return server
// })
// import type {
//   CallToolResult,
//   GetPromptResult,
//   ReadResourceResult,
// } from '@modelcontextprotocol/server';
// import { McpServer } from '@modelcontextprotocol/server';
// import { z } from 'zod';
//
// export function getServer() {
//   // Create an MCP server with implementation details
//   const server = new McpServer({
//     name: 'fetch-mcp-server',
//     version: '1.0.0',
//   });
//
//   // Register a simple prompt
//   server.registerPrompt(
//     'greeting-template',
//     {
//       description: 'A simple greeting prompt template',
//       argsSchema: z.object({
//         name: z.string().describe('Name to include in greeting'),
//       }),
//     },
//     async ({ name }): Promise<GetPromptResult> => {
//       return {
//         messages: [
//           {
//             role: 'user',
//             content: {
//               type: 'text',
//               text: `Please greet ${name} in a friendly manner.`,
//             },
//           },
//         ],
//       };
//     }
//   );
//
//   server.registerTool(
//     'greet',
//     {
//       description: 'Greet a user by name',
//       inputSchema: z.object({
//         name: z.string().describe('Name of the person to greet'),
//       }),
//     },
//     async ({ name }): Promise<CallToolResult> => {
//       return {
//         content: [
//           {
//             type: 'text',
//             text: `Hello, ${name}!`,
//           },
//         ],
//       };
//     }
//   );
//
//   // Create a simple resource at a fixed URI
//   server.registerResource(
//     'greeting-resource',
//     'https://example.com/greetings/default',
//     { mimeType: 'text/plain' },
//     async (): Promise<ReadResourceResult> => {
//       return {
//         contents: [
//           {
//             uri: 'https://example.com/greetings/default',
//             text: 'Hello, world!',
//           },
//         ],
//       };
//     }
//   );
//
//   return server;
// }

import { z } from 'zod';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { McpServer } from '@modelcontextprotocol/server';

type IdentityClaims = {
  user_id: string;
  email: string;
  email_verified: boolean;
  first_name?: string;
};

function claimsFrom(authInfo: AuthInfo): IdentityClaims {
  const claims = authInfo.extra as unknown as Partial<IdentityClaims>;

  if (
    typeof claims.user_id !== 'string' ||
    typeof claims.email !== 'string' ||
    typeof claims.email_verified !== 'boolean' ||
    typeof claims.first_name !== 'string'
  ) {
    throw new Error('A verified email address is required.');
  }

  return {
    user_id: claims.user_id,
    email: claims.email,
    email_verified: true,
    first_name: claims.first_name,
  };
}

export function getServer(authInfo: AuthInfo) {
  const identity = claimsFrom(authInfo);

  const server = new McpServer({
    name: 'AlgoSense',
    version: '1.0.0',
  });


  server.registerTool(
    'get_my_profile',
    {
      description: 'Return the signed-in AlgoSense profile.',
      inputSchema: z.object({}),
    },
    async () => {
      // Call your user DAO/use case here:
      //
      // const user = await findOrCreateMcpUser(identity);
      //
      // Use identity.user_id (Auth0 `sub`) as the stable external key,
      // not the email address.
      return {
        content: [{
          type: 'text',
          text: `Authenticated as ${identity.email}, ${identity.user_id}`,
        }],
      };
    },
  );

  return server;
}
