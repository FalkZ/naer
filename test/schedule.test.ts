import { test, expect } from "vitest";
import { Naer } from "../lib/naer";
import { Temporal } from "temporal-polyfill";

test("schedule on time", async () => {
  const naer = new Naer({
    config: {
      connection: {
        host: "localhost",
        port: 27811,
      },
    },
  });

  const scheduledDate = Temporal.Now.instant().add({ seconds: 12 });

  const triggerDate = await new Promise<Temporal.Instant>(async (resolve) => {
    const task = naer.task({
      name: "test",
      run: () => {
        resolve(Temporal.Now.instant());
      },
    });

    await task.schedule({
      date: scheduledDate,
    });
  });

  const delayed = scheduledDate.until(triggerDate).total("microseconds");

  expect(delayed).toBeLessThan(100000);
});
