import { Queue } from "bullmq"
import type { IJobQueue, IJobDetails } from "../../../interfaces/index.js"
import InternalServerError from "../../../errors/internalServerError.js"

class BullMqQueue<T> implements IJobQueue<T> {
  constructor(protected bullmqQueue: Queue) { }
  async addJob(entry: T): Promise<IJobDetails<T>> {
    let job
    try {
      job = await this.bullmqQueue.add('ai-evaluation-job', { entry })
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
}

const AIEvaluationQueue: Queue = new Queue('ai-evaluation-queue', {
  connection: {
    host: 'localhost',
    port: 6379
  }
})

export default new BullMqQueue<string>(AIEvaluationQueue)

