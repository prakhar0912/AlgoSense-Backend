export interface IJobDetails<T> {
  id: string
  body: T
}

export interface IJobQueue<T> {
  rateLimit(durationMs: number): Promise<void>
  close(): Promise<void>
  addJob(jobName: string, entry: T): Promise<IJobDetails<T>>
  isReady(): Promise<boolean>
}
