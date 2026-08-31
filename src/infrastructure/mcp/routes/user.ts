import type { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import type { AuthInfo } from '@modelcontextprotocol/server';
import fs from "node:fs/promises";
import path from "node:path";

import UserController from '../../../controllers/user.js'
import services from '../../../config/services.js'
import { GetSubmissionsById, UpdateUserProfile, RegisterUser, DeleteUser, FindUserbyId, SubmitSolution, UpdateConsistencyScore, UpdateUserScore } from '../../../use-cases/user/index.js'
import UnauthorizedError from '../../../errors/unauthorizedError.js'
import requireScope from "../../utils/auth/auth0/mcpAuthorization.js";
import InternalServerError from "../../../errors/internalServerError.js";
import { sanitize } from "isomorphic-dompurify";

import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps";

const userDAO = new services.user.DAO()
const problemDAO = new services.problem.DAO()
const submissionDAO = new services.submission.DAO()


const userController = new UserController(
  new FindUserbyId(userDAO),
  new DeleteUser(userDAO),
  new SubmitSolution(problemDAO, services.utils.askGPT, services.problem.validators.modelResponseValidator, services.problem.validators.problemSolutionValidator, services.user.notifier),
  new UpdateConsistencyScore(),
  new UpdateUserScore(userDAO),
  new UpdateUserProfile(userDAO, services.user.validators.updateUser),
  new RegisterUser(userDAO, services.user.validators.registerValidator),
  new GetSubmissionsById(submissionDAO),

  services.user.validators.updateUser,

  services.user.notifier
)



export default function registerUserTools(server: McpServer, authInfo: AuthInfo) {


  const toolsAndUri = {
    "get-my-profile": "ui://user/my-profile.html",
    "see-my-submissions": "ui://user/my-submissions.html",
    "submit-solution": "ui://user/submit-solution.html",
  }


  server.registerTool(
    'get_my_profile',
    {
      title: "Show the User's AlgoSense Profile",
      description: 'Return the signed-in AlgoSense profile.',
      inputSchema: z.object({}),
      _meta: { ui: { resourceUri: toolsAndUri['get-my-profile'] } }
    },
    async () => {
      const userId = authInfo.clientId

      requireScope(authInfo, services.permissions.user.viewSelf)
      const profile = await userController.getProfile({ userId })

      return {
        content: [{
          type: 'text',
          text: "User Profle",
        }],
        structuredContent: profile
      };
    }
  )

  server.registerResource(
    'get-my-profile',
    toolsAndUri['get-my-profile'],
    {
      title: "Show the User's AlgoSense Profile",
      description: "Return the signed-in AlgoSense profile.",
      mimeType: RESOURCE_MIME_TYPE,
    },
    async () => {

      const html = await fs.readFile(path.join(
        "src",
        "infrastructure",
        "mcp",
        "bundledHTML",
        "userProfile.html",
      ),
        "utf8",
      );

      return {
        contents: [
          {
            uri: toolsAndUri['get-my-profile'],
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    },
  );

  server.registerTool(
    'see-my-submissions',
    {
      title: "Show the User's submissions",
      description: 'Return the signed-in AlgoSense Problem Submissions',
      inputSchema: z.object({
        page: z.number().default(1),
        perPage: z.number().default(10),
      }),
      _meta: { ui: { resourceUri: toolsAndUri['see-my-submissions'] } }
    },
    async ({ page, perPage }) => {
      try {
        const userId = authInfo.clientId
        requireScope(authInfo, services.permissions.user.viewSelfSubmission)
        if (userId === undefined) {
          throw new UnauthorizedError('User ID is required')
        }
        const result = await userController.getUserSubmissions({ userId, params: { page, perPage } })
        return {
          content: [{
            type: 'text',
            text: "User Submissions"
          }],
          structuredContent: result
        }
      } catch (err) {
        throw new InternalServerError("Failed to get your Submissions")
      }
    }
  )

  server.registerResource(
    'see-my-submissions',
    toolsAndUri['see-my-submissions'],
    {
      title: "User Submissions Page",
      description: "Display the User's Submissions",
      mimeType: RESOURCE_MIME_TYPE,
    },
    async () => {

      const html = await fs.readFile(path.join(
        "src",
        "infrastructure",
        "mcp",
        "bundledHTML",
        "userSubmissions.html",
      ),
        "utf8",
      );

      return {
        contents: [
          {
            uri: toolsAndUri['see-my-submissions'],
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    },
  )


  server.registerTool(
    'submit-solution',
    {
      title: "Submit a solution against/for a AlgoSense Problem",
      description: 'Submit the solution to a viewed problem',
      inputSchema: z.object({
        problem_id: z.string().transform((val) => sanitize(val)),
        userInput: z.string().min(20, "Solution must be at least 20 characters long").max(3000, "Solution must be at most 1500 characters long").transform((val) => sanitize(val)),
      }),
      _meta: { ui: { resourceUri: toolsAndUri['submit-solution'], ProgressNotificationSchema: { ProgressTokenSchema: "submit-sol-progress" } } }
    },
    async ({ problem_id, userInput }, extra) => {
      try {
        const userId = authInfo.clientId
        requireScope(authInfo, services.permissions.user.createSubmission)
        if (userId === undefined) {
          throw new UnauthorizedError('User ID is required')
        }
        const result = await userController.submitAnswer({ body: { problem_id, userInput }, userId, mcpServerContext: extra })
        return {
          content: [{
            type: 'text',
            text: `Submitted Solution Evaluvation Result`,
          }],
          structuredContent: result
        }
      } catch (err) {
        console.log(err)
        throw new InternalServerError("Failed to Submit your Solution please try again")
      }
    }
  )

  server.registerResource(
    'submit-solution',
    toolsAndUri['submit-solution'],
    {
      title: "User's Solution Evaluvation Page",
      description: "Display the User's Submission Evaluvation",
      mimeType: RESOURCE_MIME_TYPE,
    },
    async () => {

      const html = await fs.readFile(path.join(
        "src",
        "infrastructure",
        "mcp",
        "bundledHTML",
        "submittedSolution.html",
      ),
        "utf8",
      );

      return {
        contents: [
          {
            uri: toolsAndUri['submit-solution'],
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    },
  )


  server.registerTool(
    'delete-user-profile',
    {
      description: 'Submit the solution to a viewed problem',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const userId = authInfo.clientId
        requireScope(authInfo, services.permissions.user.deleteSelf)

        if (userId === undefined) {
          throw new UnauthorizedError('User ID is required')
        }
        const success = await userController.deleteSelfUser({ userId })
        return {
          content: [{
            type: 'text',
            text: `${success ? "🟢 Successfully deleted your profile." : "🔴 Unable to delete your profile."}`,
          }],
        }
      } catch (err) {
        throw new InternalServerError("🔴 Failed to delete your profile")
      }
    }
  )
}
