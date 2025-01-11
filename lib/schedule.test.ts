import { test, expect } from "vitest";
import { Naer } from "./naer";
import { Temporal } from "temporal-polyfill";

test("schedule on time", async () => {
  const naer = new Naer({
    config: {
      db: {
        address: "mongodb://localhost:27811/naer",
      },
    },
  });

  const scheduledDate = Temporal.Now.instant().add({ seconds: 12 });

  const triggerDate = await new Promise<Temporal.Instant>(async (resolve) => {
    const task = naer.task({
      name: "test",
      callback: () => {
        resolve(Temporal.Now.instant());
      },
    });

    await task.schedule({
      date: scheduledDate,
    });
  });

  const delayed = scheduledDate.until(triggerDate).total("microseconds");

  expect(delayed).toBeLessThan(60000);
});
