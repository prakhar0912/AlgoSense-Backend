import type { AuthInfo } from '@modelcontextprotocol/server';
import { McpServer } from '@modelcontextprotocol/server';
import registerUserTools from './routes/user.js';
import registerProblemTools from './routes/problem.js';
import UnauthorizedError from '../../errors/unauthorizedError.js';
import { newUserRegistration, newLogin } from './middleware/user.js';


function claimsFrom(authInfo: AuthInfo) {
  const claims = authInfo.extra

  if (
    typeof claims?.user_id !== 'string' ||
    typeof claims?.email !== 'string' ||
    typeof claims?.email_verified !== 'boolean' ||
    typeof claims?.first_name !== 'string' ||
    !Array.isArray(claims?.roles)
  ) {
    throw new UnauthorizedError('Valid User not found');
  }
}

export function getServer(authInfo: AuthInfo) {
  claimsFrom(authInfo);
  newUserRegistration(authInfo)
  newLogin(authInfo)

  const server = new McpServer({
    name: 'AlgoSense',
    version: '1.0.0',

  }, {
    capabilities: { tools: {} }
  });

  // server.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  //   console.log(extra.mcpReq)
  // })
  //

  registerUserTools(server, authInfo)
  registerProblemTools(server, authInfo)
  return server;
}
