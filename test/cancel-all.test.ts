import { test, expect } from "vitest";
import { Naer } from "../lib/naer";
import { Temporal } from "temporal-polyfill";

const promiseTimeout = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

test("tasks can all be cancelled", async () => {
  const naer = new Naer({
    config: {
      db: {
        address: "mongodb://localhost:27811/naer",
      },
    },
  });

  const scheduledDate = Temporal.Now.instant().add({ seconds: 5 });

  let wasCalled = false;

  console.log("naer created");

  const task = naer.task({
    name: "test-cancel-all",
    callback: () => {
      wasCalled = true;
    },
  });

  console.log("task defined");

  await task.schedule({
    date: scheduledDate,
  });

  await task.schedule({
    date: scheduledDate,
  });

  console.log("scheduled");

  await task.cancelAll();

  console.log("cancelled");

  await promiseTimeout(10000);

  expect(wasCalled).toBe(false);
});
