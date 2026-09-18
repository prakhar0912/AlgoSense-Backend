import type { Application } from 'express'

export interface IHealthProbeState {
  started: boolean
  shuttingDown: boolean
  dependenciesReady: boolean
  lastCheckedAt: number | null
}

export interface IProbeOptions {
  readinessChecks: ReadonlyArray<() => Promise<boolean>>
  isLocallyReady?: () => boolean
  freshnessMs?: number
}

export interface IProbe {
  attach(app: Application): void
  markStarted(): void
  markShuttingDown(): void
  isReady(): boolean
  refreshDependencyCheck(): Promise<void>
  startMonitor(): void
  stopMonitor(): void
}
