export interface IJobDetails<T> {
  id: string
  body: T
}

export interface IJobQueue<T> {
  addJob(entry: T): Promise<IJobDetails<T>>
}
