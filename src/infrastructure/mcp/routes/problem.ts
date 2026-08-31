import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { AuthInfo } from '@modelcontextprotocol/server';
import requireScope from "../../utils/auth/auth0/mcpAuthorization.js";
import services from "../../../config/services.js";
import ProblemController from "../../../controllers/problem.js";
import { GetProblemByIdForAdmin, GetProblemBySlugForAdmin, ListProblemsForAdmin, CreateProblem, DeleteProblem, UpdateProblem } from '../../../use-cases/admin/index.js'
import { GetProblemByIdForUser, GetProblemBySlugForUser, ListProblemsForUser } from '../../../use-cases/user/index.js'
import UnauthorizedError from "../../../errors/unauthorizedError.js";
import InternalServerError from "../../../errors/internalServerError.js";
import { sanitize } from "isomorphic-dompurify";
import {
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import fs from "node:fs/promises";
import path from "node:path";



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


export default function registerProblemTools(server: McpServer, authInfo: AuthInfo) {

  const toolsAndUri = {
    "find-by-id": "ui://problem/find-by-id.html",
    "view-all-problems": "ui://problem/view-all-problems.html",
    "find-by-slug": "ui://problem/find-by-slug.html"
  }

  server.registerTool(
    'view-all-problems',
    {
      title: "View all Problems",
      description: 'Return all the DSA problems/questions that can be practiced using AlgoSense.',
      inputSchema: z.object({
        page: z.number().default(1),
        perPage: z.number().default(10),
      }),
      _meta: { ui: { resourceUri: toolsAndUri['view-all-problems'] } }

    },
    async ({ page, perPage }) => {
      try {
        const userId = authInfo.clientId
        requireScope(authInfo, services.permissions.user.viewPartialProblem)

        if (userId === undefined) {
          throw new UnauthorizedError('User ID is required')
        }
        const result = await problemController.getPaginatedProblemsForUser({ userId, params: { page, perPage }, body: {} })
        return {
          content: [{
            type: 'text',
            text: "Paginated Problems"
          }],
          structuredContent: result
        }
      } catch (err) {
        throw new InternalServerError("Unable to get you the DSA Problems")
      }
    }
  )


  server.registerResource(
    'view-all-problems',
    toolsAndUri['view-all-problems'],
    {
      description: "Show paginated problems",
      mimeType: RESOURCE_MIME_TYPE,
    },
    async () => {

      const html = await fs.readFile(path.join(
        "src",
        "infrastructure",
        "mcp",
        "bundledHTML",
        "paginatedProblem.html",
      ),
        "utf8",
      );

      return {
        contents: [
          {
            uri: toolsAndUri['view-all-problems'],
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    },
  );


  server.registerTool(
    'find-problem-by-id',
    {
      title: "Find a Problem using it's ID",
      description: 'Return the DSA problem/question using the provided id, that can be practiced using AlgoSense.',
      inputSchema: z.object({
        id: z.string().transform((val) => sanitize(val)),
      }),
      _meta: { ui: { resourceUri: toolsAndUri['find-by-id'] } }
    },
    async ({ id }) => {
      try {
        const userId = authInfo.clientId
        requireScope(authInfo, services.permissions.user.viewPartialProblem)
        if (userId === undefined) {
          throw new UnauthorizedError('User ID is required')
        }

        const result = await problemController.getProblemByIdUser({ userId, params: { id } })
        return {
          content: [{
            type: 'text',
            text: result.title,
          }],
          structuredContent: result
        }
      } catch (err) {
        throw new InternalServerError("Unable to get you the DSA Problem")
      }
    }
  )


  server.registerResource(
    'find-by-id',
    toolsAndUri['find-by-id'],
    {
      description: "Show the problem using it's ID interactively.",
      mimeType: RESOURCE_MIME_TYPE,
      _meta: {
        ui: {
          csp: {
            connectDomains: ['http://localhost:3000'],
            resourceDomains: ['']
          }
        }
      }
    },
    async () => {

      const html = await fs.readFile(path.join(
        "src",
        "infrastructure",
        "mcp",
        "bundledHTML",
        "displayProblem.html",
      ),
        "utf8",
      );

      return {
        contents: [
          {
            uri: toolsAndUri['find-by-id'],
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    },
  );




  server.registerTool(
    'find-problem-by-slug',
    {
      title: "Find a AlgoSense Problem using it's slug",
      description: 'Return the DSA problem/question using the provided slug, that can be practiced using AlgoSense.',
      inputSchema: z.object({
        slug: z.string().transform((val) => sanitize(val)),
      }),
      _meta: { ui: { resourceUri: toolsAndUri['find-by-slug'] } }
    },
    async ({ slug }) => {
      try {
        const userId = authInfo.clientId
        requireScope(authInfo, services.permissions.user.viewPartialProblem)
        if (userId === undefined) {
          throw new UnauthorizedError('User ID is required')
        }
        const id = slug
        const result = await problemController.getProblemBySlugUser({ userId, params: { id } })
        return {
          content: [{
            type: 'text',
            text: `${result.title}`,
          }],
          structuredContent: result
        }
      } catch (err) {
        throw new InternalServerError("Unable to get you the DSA Problem")
      }
    }
  )
  server.registerResource(
    'find-by-slug',
    toolsAndUri['find-by-slug'],
    {
      description: "Show the problem using it's slug interactively.",
      mimeType: RESOURCE_MIME_TYPE,
    },
    async () => {

      const html = await fs.readFile(path.join(
        "src",
        "infrastructure",
        "mcp",
        "bundledHTML",
        "displayProblem.html",
      ),
        "utf8",
      );

      return {
        contents: [
          {
            uri: toolsAndUri['find-by-slug'],
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    },
  );


}
