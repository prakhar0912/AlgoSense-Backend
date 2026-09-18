import type { Application } from 'express'
import type { IHealthProbeState, IProbe, IProbeOptions } from '../../interfaces/index.js'

export class HealthProbe implements IProbe {
  private readonly state: IHealthProbeState = {
    started: false,
    shuttingDown: false,
    dependenciesReady: false,
    lastCheckedAt: null,
  }
  private checkInProgress = false
  private timer: NodeJS.Timeout | undefined

  constructor(private readonly options: IProbeOptions) { }

  attach(app: Application): void {
    app.get('/startupz', (_req, res) => {
      res.status(this.state.started ? 200 : 503).json({
        status: this.state.started ? 'started' : 'starting',
      })
    })

    // Dependency outages must not trigger container restarts.
    app.get('/livez', (_req, res) => {
      res.status(200).json({ status: 'alive' })
    })

    app.get('/readyz', (_req, res) => {
      const ready = this.isReady()
      res.status(ready ? 200 : 503).json({
        status: ready ? 'ready' : 'not-ready',
      })
    })
  }

  markStarted(): void {
    if (!this.state.shuttingDown) {
      this.state.started = true
    }
  }

  markShuttingDown(): void {
    this.state.shuttingDown = true
    this.stopMonitor()
  }

  isReady(): boolean {
    const fresh = this.state.lastCheckedAt !== null &&
      Date.now() - this.state.lastCheckedAt < (this.options.freshnessMs ?? 15_000)

    return this.state.started &&
      !this.state.shuttingDown &&
      this.state.dependenciesReady &&
      fresh &&
      (this.options.isLocallyReady?.() ?? true)
  }

  async refreshDependencyCheck(): Promise<void> {
    if (this.checkInProgress || this.state.shuttingDown) { return }

    this.checkInProgress = true
    try {
      const results = await Promise.all(this.options.readinessChecks.map(async (check) => {
        try {
          return await check()
        } catch {
          return false
        }
      }))

      if (!this.state.shuttingDown) {
        this.state.dependenciesReady = results.every(result => result)
        this.state.lastCheckedAt = Date.now()
      }
    } finally {
      this.checkInProgress = false
    }
  }

  startMonitor(): void {
    if (this.timer || this.state.shuttingDown) { return }

    void this.refreshDependencyCheck()
    this.timer = setInterval(() => {
      void this.refreshDependencyCheck()
    }, 5_000)
    this.timer.unref()
  }

  stopMonitor(): void {
    clearInterval(this.timer)
    this.timer = undefined
    this.state.dependenciesReady = false
    this.state.lastCheckedAt = null
  }
}
