import pool from './infrastructure/data-access/client.js'
import services from './config/services.js'
import api from './infrastructure/api/express/index.js'
import config from './config/app.js'
import restApiProbe from './infrastructure/health-probes/restApiProbe.js'
import mcp from './infrastructure/mcp/index.js'
import type { Server } from 'node:http'

if (config.load_test_parameters.load_testing) {
  console.log("Load Testing Mode")
}


const apiServer: Server = api.listen(config.api.port, (error?: Error) => {
  if (error) {
    console.error('Failed to start API server', error)
    void shutdown('API listen error', true)
    return
  }
  restApiProbe.markStarted()
  restApiProbe.startMonitor()
  console.log(`API listening on port ${config.api.port}`)
})

let mcpServer: Server | undefined
if (!config.load_test_parameters.load_testing) {
  mcpServer = mcp.listen(config.mcp.port, (error?: Error) => {
    if (error) {
      console.error('Failed to start MCP server', error)
      void shutdown('MCP listen error', true)
      return
    }
    console.log(`MCP listening on port ${config.mcp.port}`)
  })
}


function closeServer(server: Server | undefined): Promise<void> {
  if (!server?.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

let shutdownStarted = false;

async function shutdown(signal: string, failed = false): Promise<void> {
  if (shutdownStarted) { return }

  shutdownStarted = true;
  restApiProbe.markShuttingDown();

  console.log(`Received ${signal}; shutting down`);

  let shutdownFailed = failed;

  try {
    const serverResults = await Promise.allSettled([
      closeServer(apiServer),
      closeServer(mcpServer),
    ]);

    for (const result of serverResults) {
      if (result.status === "rejected") {
        shutdownFailed = true;
        console.error("Failed to close an HTTP server", result.reason)
      }
    }
  }
  finally {
    const dependencyResults = await Promise.allSettled([
      pool.end(),
      services.queue.evaluationQueue.close(),
    ]);

    for (const result of dependencyResults) {
      if (result.status === "rejected") {
        shutdownFailed = true
        console.error("Failed to close an application dependency", result.reason)
      }
    }

    process.exitCode = shutdownFailed ? 1 : 0;

    console.log(shutdownFailed
      ? "Shutdown completed with errors"
      : "Shutdown complete",
    )
  }
}

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
