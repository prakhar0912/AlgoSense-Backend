export interface IJobDetails<T> {
  id: string
  body: T
}

export interface IJobQueue<T> {
  addJob(jobName: string, entry: T): Promise<IJobDetails<T>>
}
