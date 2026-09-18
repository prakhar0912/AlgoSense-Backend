import type { Worker } from 'bullmq'
import { HealthProbe } from './probe.js'
import { checkDatabase } from './dependency/checkDatabase.js'

export function createWorkerProbe(worker: Worker): HealthProbe {
  async function checkWorkerRedis(): Promise<boolean> {
    const backend = worker.getBackend()
    if (worker.closing || backend.closing ||
      backend.connection.status !== 'ready' ||
      backend.blockingConnection?.status !== 'ready') {
      return false
    }

    const blockingClientPromise = backend.blockingClient
    if (!blockingClientPromise) { return false }

    const [client, blockingClient] = await Promise.all([
      backend.client,
      blockingClientPromise,
    ])

    return client.status === 'ready' && blockingClient.status === 'ready'
  }

  return new HealthProbe({
    readinessChecks: [checkDatabase, checkWorkerRedis],
    isLocallyReady: () => !worker.closing && worker.isRunning() && !worker.isPaused(),
  })
}
