import { Agenda, AgendaConfig, Job } from "agenda";
import deepMerge from "deepmerge";
import { Temporal } from "temporal-polyfill";
import { Jsonifiable } from "type-fest";
import { temporalToDate } from "./utils";

type ErrorCb = (type: "startup" | "agenda" | "task", err: unknown) => void;

type NaerConstructor = {
  onError?: ErrorCb;
  config?: AgendaConfig;
};

type TaskArg<Data extends Jsonifiable> = {
  name: string;
  callback: (data: Data) => void | Promise<void>;
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
  cancel: () => void;
};

const defaultErrorCb: ErrorCb = (type, err) => {
  console.error(`${type} error:`, err);
};

const defaultConfig: AgendaConfig = {
  db: {
    address: "mongodb://localhost:27819/naer",
  },
};

const setTimeoutBuffer = 10000;

export class Naer {
  private agenda: Agenda;
  private isInitialized: Promise<boolean>;
  private onError: ErrorCb;

  constructor({ config = {}, onError = defaultErrorCb }: NaerConstructor = {}) {
    this.agenda = new Agenda(deepMerge(defaultConfig, config));

    this.onError = onError;

    this.isInitialized = this.agenda
      .start()
      .then(() => true)
      .catch((err) => {
        this.onError("startup", err);
        return false;
      });

    this.agenda.on("error", (err) => this.onError("agenda", err));
  }

  task<Data extends Jsonifiable>(task: TaskArg<Data>): NaerTask<Data> {
    this.agenda.define<{ data: Data; date: string }>(
      task.name,
      (job: Job<{ data: Data; date: string }>) =>
        new Promise<void>((resolve, reject) => {
          const runTask = async () => {
            try {
              await task.callback(job.attrs.data.data);
            } catch (err) {
              this.onError?.("task", err);
              reject(err);
            }

            resolve();
          };

          return runTask();

          const scheduledDate = Temporal.Instant.from(job.attrs.data.date);

          const now = Temporal.Now.instant();
          const startTime = performance.now();
          const timeout = now.until(scheduledDate);

          const delay = timeout.total("milliseconds");

          if (timeout.sign === -1) {
            runTask();
          } else {
            setTimeout(() => {
              runTask();
            }, delay - (performance.now() - startTime));
          }
        })
    );

    const t: NaerTask<Data> = {
      name: task.name,
      schedule: async (schedule) => {
        await this.isInitialized;

        const scheduledDate = temporalToDate(schedule.date);

        const job = await this.agenda.schedule(scheduledDate, task.name, {
          date: scheduledDate.toISOString(),
          data: schedule.data,
        });

        return {
          name: task.name,
          cancel: () => job.disable().remove(),
        };
      },
      cancelAll: async () => {
        await this.isInitialized;
        return (await this.agenda.cancel({ name: task.name })) ?? 0;
      },
    };

    return t;
  }
}
