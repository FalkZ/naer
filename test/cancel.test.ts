import { test, expect } from "vitest";
import { Naer } from "../lib/naer";
import { Temporal } from "temporal-polyfill";

const promiseTimeout = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

test("schedule can be cancelled", async () => {
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
    name: "test-cancel",
    callback: () => {
      wasCalled = true;
    },
  });

  console.log("task defined");

  const instance = await task.schedule({
    date: scheduledDate,
  });

  console.log("scheduled");

  await instance.cancel();

  console.log("cancelled");

  await promiseTimeout(10000);

  expect(wasCalled).toBe(false);
});
