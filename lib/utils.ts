import { Temporal } from "temporal-polyfill";

export const getEpochMilliseconds = (date: Date | Temporal.Instant) =>
  date instanceof Date ? date.getTime() : date.epochMilliseconds;
