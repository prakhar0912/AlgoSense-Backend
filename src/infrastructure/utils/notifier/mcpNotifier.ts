
import type { ServerContext } from '@modelcontextprotocol/server';
import InternalServerError from '../../../errors/internalServerError.js';
import type { INotifier } from '../../../interfaces/index.js';

class MCPNotifier implements INotifier {
  constructor() { }
  async notify(serverContext: ServerContext | undefined, progress: number, total: number, status: string) {
    try {
      if (serverContext?.mcpReq?.notify) {
        await serverContext.mcpReq.notify({
          method: 'notifications/progress',
          params: {
            progressToken: serverContext?.mcpReq?._meta?.progressToken,
            progress,
            total,
            message: status,
          }
        })
      }
      else {
        console.log("No notifier function provided by the request!")
      }
    }
    catch (e) {
      console.log(e)
      throw new InternalServerError("Failed to send progress notification!")
    }
  }
}
export default new MCPNotifier() 
