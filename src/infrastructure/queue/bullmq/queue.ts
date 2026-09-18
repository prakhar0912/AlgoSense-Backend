import type { Queue } from "bullmq"
import type { IJobQueue, IJobDetails } from "../../../interfaces/index.js"
import InternalServerError from "../../../errors/internalServerError.js"

export class BullMqQueue<T> implements IJobQueue<T> {
  constructor(protected bullmqQueue: Queue) { }
  async close(): Promise<void> {
    await this.bullmqQueue.close()
  }
  async addJob(jobName: string, entry: T): Promise<IJobDetails<T>> {
    let job
    try {
      job = await this.bullmqQueue.add(jobName, entry, { jobId: String(entry) })
    }
    catch (e) {
      throw new InternalServerError("Failed to submit the job to the job queue", e)
    }
    if (!job.id) {
      throw new InternalServerError("Failed to submit the job to the job queue, without an error thrown")
    }

    return {
      id: job.id,
      body: job.data as T
    }
  }
  async isReady(): Promise<boolean> {
    if (this.bullmqQueue.closing) {
      return false
    }
    const backend = this.bullmqQueue.getBackend()
    if (backend.closing || backend.connection.status !== "ready") {
      return false
    }

    try {
      const redisClient = await backend.client
      return redisClient.status === "ready"
    }
    catch {
      return false
    }
  }
}
