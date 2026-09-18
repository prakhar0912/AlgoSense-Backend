export interface IJobDetails<T> {
  id: string
  body: T
}

export interface IJobQueue<T> {
  close(): Promise<void>
  addJob(jobName: string, entry: T): Promise<IJobDetails<T>>
  isReady(): Promise<boolean>
}
