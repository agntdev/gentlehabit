/** Private, user-scoped habit records. These values live in the toolkit session
 * adapter (Redis in Node production and a Durable Object in Workers), never in
 * a process-global collection. The array is therefore an indexed user record,
 * not a keyspace scan. */
export type ScheduleType = "daily" | "weekdays" | "custom";
export type CheckinStatus = "done" | "skipped";

export interface Habit {
  id: string;
  name: string;
  scheduleType: ScheduleType;
  days?: number[];
  reminderTime: string;
  active: boolean;
  createdAt: string;
}
export interface Checkin { habitId: string; date: string; status: CheckinStatus; }
export interface HabitProfile {
  telegramId: number;
  timeZone: string;
  milestones: boolean;
  habits: Habit[];
  checkins: Checkin[];
}
export interface HabitFlow {
  step?: "name" | "schedule" | "custom-days" | "time" | "timezone";
  name?: string;
  scheduleType?: ScheduleType;
  days?: number[];
}
export interface HabitState { habitProfile?: HabitProfile; habitFlow?: HabitFlow; }

export function state(session: object): HabitState { return session as HabitState; }
export function profile(session: object): HabitProfile | undefined { return state(session).habitProfile; }
export function ensureProfile(session: object, telegramId: number, zone = "UTC"): HabitProfile {
  const s = state(session);
  return (s.habitProfile ??= { telegramId, timeZone: zone, milestones: true, habits: [], checkins: [] });
}

// A single clock seam makes day boundaries and streak decisions testable.
let clock: () => Date = () => new Date();
export function now(): Date { return clock(); }
export function setClockForTests(next?: () => Date): void { clock = next ?? (() => new Date()); }

export function dateInZone(date: Date, zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "01";
    return `${pick("year")}-${pick("month")}-${pick("day")}`;
  } catch { return date.toISOString().slice(0, 10); }
}
export function validZone(zone: string): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone: zone }); return true; } catch { return false; }
}
export function isScheduled(habit: Habit, date: Date, zone: string): boolean {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekday = names.indexOf(new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(date));
  if (habit.scheduleType === "daily") return true;
  if (habit.scheduleType === "weekdays") return weekday >= 1 && weekday <= 5;
  return habit.days?.includes(weekday) ?? false;
}
export function metrics(p: HabitProfile, habit: Habit): { current: number; longest: number; rate: number } {
  const done = new Set(p.checkins.filter((c) => c.habitId === habit.id && c.status === "done").map((c) => c.date));
  const currentDay = new Date(now());
  let current = 0;
  for (let i = 0; i < 366; i++) { const d = new Date(currentDay); d.setUTCDate(d.getUTCDate() - i); const key = dateInZone(d, p.timeZone); if (done.has(key)) current++; else if (i > 0) break; }
  const dates = [...done].sort(); let longest = 0; let run = 0; let previous = "";
  for (const key of dates) { if (!previous || Math.round((Date.parse(key + "T00:00:00Z") - Date.parse(previous + "T00:00:00Z")) / 86400000) === 1) run++; else run = 1; longest = Math.max(longest, run); previous = key; }
  const scheduled = p.checkins.filter((c) => c.habitId === habit.id).length;
  return { current, longest, rate: scheduled ? Math.round((done.size / scheduled) * 100) : 0 };
}
export function escapeText(value: string): string { return value.replace(/[<>]/g, "").trim(); }
