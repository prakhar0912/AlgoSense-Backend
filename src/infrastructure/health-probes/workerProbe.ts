import type { Worker } from 'bullmq'
import { HealthProbe } from './probe.js'
import { checkDatabase } from './dependency/checkDatabase.js'

export function createWorkerProbe(worker: Worker): HealthProbe {
  let consecutiveFailures = 0
  let consecutiveSuccesses = 0
  let workerControlledByProbe = !worker.isRunning()

  async function synchronizeWorker(dependenciesReady: boolean): Promise<void> {
    if (worker.closing) {
      return
    }

    if (!dependenciesReady) {
      consecutiveFailures++
      consecutiveSuccesses = 0

      if (consecutiveFailures >= 3 && !worker.isPaused()) {
        await worker.pause(true)
        workerControlledByProbe = true
        console.warn('Worker paused because dependencies are unavailable')
      }

      return
    }

    consecutiveFailures = 0
    consecutiveSuccesses++

    const needsStart =
      workerControlledByProbe ||
      (!worker.isRunning() && !worker.isPaused());

    if (consecutiveSuccesses >= 2 && needsStart) {
      await worker.resume()
      workerControlledByProbe = false
      console.log('Worker resumed after dependencies recovered')
    }
  }

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
    onDependenciesChecked: synchronizeWorker
  })
}
