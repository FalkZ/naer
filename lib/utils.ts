import { Temporal } from "temporal-polyfill";

export const temporalToDate = (date: Date | Temporal.Instant) =>
  date instanceof Date ? date : new Date(date.toString());

export const addMs = (date: Date, ms: number) => new Date(date.getTime() + ms);
