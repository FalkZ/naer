import { Queue, Worker, Job } from "bullmq";
import { Temporal } from "temporal-polyfill";
import { Jsonifiable } from "type-fest";
import { getEpochMilliseconds } from "./utils";

type ErrorCb = (type: "startup" | "queue" | "task", err: unknown) => void;

type NaerConstructor = {
  onError?: ErrorCb;
  config?: {
    connection?: {
      host?: string;
      port?: number;
    };
  };
};

type TaskArg<Data extends Jsonifiable> = {
  name: string;
  run: (data: Data) => void | Promise<void>;
};

type ScheduleArg<Data extends Jsonifiable> = Data extends undefined
  ? {
      date: Date | Temporal.Instant;
    }
  : {
      date: Date | Temporal.Instant;
      data?: Data;
    };

export type NaerTask<Data extends Jsonifiable> = {
  name: string;
  /**
   * Schedule this task
   * @returns The scheduled task instance
   */
  schedule: (schedule: ScheduleArg<Data>) => Promise<NaerTaskInstance>;
  /**
   * Cancel all scheduled instances of this task
   * @returns The number of cancelled tasks
   */
  cancelAll: () => Promise<number>;
};

export type NaerTaskInstance = {
  name: string;
  cancel: () => Promise<void>;
};

const defaultErrorCb: ErrorCb = (type, err) => {
  console.error(`${type} error:`, err);
};

const defaultConfig = {
  connection: {
    host: "localhost",
    port: 27819,
  },
};

export class Naer {
  private queue: Queue;
  private workers: Map<string, Worker> = new Map();
  private onError: ErrorCb;

  constructor({ config = {}, onError = defaultErrorCb }: NaerConstructor = {}) {
    this.onError = onError;
    const mergedConfig = { ...defaultConfig, ...config };

    this.queue = new Queue("naer", {
      connection: mergedConfig.connection,
    });

    this.queue.on("error", (err) => this.onError("queue", err));
  }

  task<Data extends Jsonifiable>(task: TaskArg<Data>): NaerTask<Data> {
    const worker = new Worker(
      "naer",
      async (job: Job<{ data: Data; date: string }>) => {
        try {
          await task.run(job.data.data);
        } catch (err) {
          this.onError("task", err);
          throw err;
        }
      },
      {
        connection: this.queue.opts.connection,
      }
    );

    worker.on("error", (err) => this.onError("task", err));
    this.workers.set(task.name, worker);

    const t: NaerTask<Data> = {
      name: task.name,
      schedule: async (schedule) => {
        const scheduledDate = getEpochMilliseconds(schedule.date);
        const getDelay = () => scheduledDate - Date.now();

        const job = await this.queue.add(
          task.name,
          {
            data: schedule.data,
          },
          {
            jobId: `${task.name}-${Date.now()}`,
            delay: Math.max(0, getDelay()),
          }
        );

        return {
          name: task.name,
          cancel: async () => {
            await job.remove();
          },
        };
      },
      cancelAll: async () => {
        const jobs = await this.queue.getJobs();
        const matchingJobs = jobs.filter((job) => job.name === task.name);

        await Promise.all(matchingJobs.map((job) => job.remove()));
        return matchingJobs.length;
      },
    };

    return t;
  }
}
