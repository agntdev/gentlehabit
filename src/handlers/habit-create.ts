import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { ensureProfile, escapeText, now, profile, state, validZone } from "../habits.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { scheduleDailyHabitReminder, type WorkerEnv } from "../toolkit/session/durable.js";

registerMainMenuItem({ label: "➕ Create habit", data: "habit:create", order: 10 });
const composer = new Composer<Ctx>();
const back = inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]);
const scheduleKeyboard = inlineKeyboard([
  [inlineButton("Every day", "habit:schedule:daily"), inlineButton("Weekdays", "habit:schedule:weekdays")],
  [inlineButton("Custom days", "habit:schedule:custom")], [inlineButton("Cancel", "menu:main")],
]);

async function askName(ctx: Ctx) {
  state(ctx.session).habitFlow = { step: "name" };
  await ctx.reply("What would you like to build? Send a short habit name.", { reply_markup: back });
}
composer.callbackQuery("habit:create", async (ctx) => { await ctx.answerCallbackQuery(); await askName(ctx); });
composer.callbackQuery("habit:timezone", async (ctx) => {
  await ctx.answerCallbackQuery();
  state(ctx.session).habitFlow = { step: "timezone" };
  await ctx.reply("Set your time zone first. Send an IANA name, like Europe/London or America/New_York.", { reply_markup: back });
});
composer.on("message:text", async (ctx, next) => {
  const flow = state(ctx.session).habitFlow;
  if (!flow?.step) return next();
  const text = ctx.message.text.trim();
  if (flow.step === "timezone") {
    if (!validZone(text)) { await ctx.reply("That time zone didn’t look right. Try a name like Europe/London."); return; }
    ensureProfile(ctx.session, ctx.from.id, text).timeZone = text;
    state(ctx.session).habitFlow = undefined;
    await ctx.reply("Your time zone is set. Now let’s create your first habit.", { reply_markup: inlineKeyboard([[inlineButton("Create habit", "habit:create")], [inlineButton("Back to menu", "menu:main")]]) });
    return;
  }
  if (flow.step === "name") {
    const name = escapeText(text);
    if (!name || name.length > 60) { await ctx.reply("Keep the habit name between 1 and 60 characters, then try again."); return; }
    flow.name = name; flow.step = "schedule";
    await ctx.reply("When do you want to practise it?", { reply_markup: scheduleKeyboard });
    return;
  }
  if (flow.step === "time") {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) { await ctx.reply("Send the reminder time as HH:MM, like 07:30."); return; }
    const p = profile(ctx.session) ?? ensureProfile(ctx.session, ctx.from.id);
    const id = String(p.habits.length + 1);
    p.habits.push({ id, name: flow.name!, scheduleType: flow.scheduleType!, days: flow.days, reminderTime: text, active: true, createdAt: now().toISOString() });
    const workerEnv = (ctx as unknown as { env?: WorkerEnv }).env;
    const reminderDays = flow.scheduleType === "daily" ? [0, 1, 2, 3, 4, 5, 6] : flow.scheduleType === "weekdays" ? [1, 2, 3, 4, 5] : flow.days!;
    if (workerEnv?.CHAT_DO) await scheduleDailyHabitReminder(workerEnv, ctx.chat.id, id, p.timeZone, text, flow.name!, reminderDays);
    state(ctx.session).habitFlow = undefined;
    await ctx.reply(`Your habit “${flow.name}” is ready. I’ll remind you at ${text} in ${p.timeZone}.`, { reply_markup: inlineKeyboard([[inlineButton("Check in now", "checkin:now")], [inlineButton("Back to menu", "menu:main")]]) });
    return;
  }
  return next();
});
composer.callbackQuery(/^habit:schedule:(daily|weekdays|custom)$/, async (ctx) => {
  await ctx.answerCallbackQuery(); const flow = state(ctx.session).habitFlow;
  if (!flow?.name) { await ctx.reply("Let’s start with the habit name.", { reply_markup: inlineKeyboard([[inlineButton("Create habit", "habit:create")]]) }); return; }
  const type = ctx.match[1] as "daily" | "weekdays" | "custom"; flow.scheduleType = type;
  if (type === "custom") { flow.step = "custom-days"; flow.days = []; await ctx.reply("Choose the days that fit you. Tap each day, then tap Continue.", { reply_markup: inlineKeyboard([[0,1,2,3,4,5,6].map((d) => inlineButton(["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]!, `habit:day:${d}`)), [inlineButton("Continue", "habit:days:done")]]) }); return; }
  flow.step = "time"; await ctx.reply("What time should I remind you? Send it as HH:MM, like 07:30.");
});
composer.callbackQuery(/^habit:day:([0-6])$/, async (ctx) => { await ctx.answerCallbackQuery(); const flow = state(ctx.session).habitFlow; if (!flow || flow.step !== "custom-days") return; const day = Number(ctx.match[1]); flow.days = flow.days?.includes(day) ? flow.days.filter((d) => d !== day) : [...(flow.days ?? []), day]; await ctx.answerCallbackQuery({ text: flow.days.length ? `${flow.days.length} day${flow.days.length === 1 ? "" : "s"} chosen` : "No days chosen" }); });
composer.callbackQuery("habit:days:done", async (ctx) => { await ctx.answerCallbackQuery(); const flow = state(ctx.session).habitFlow; if (!flow?.days?.length) { await ctx.reply("Choose at least one day, then continue."); return; } flow.step = "time"; await ctx.reply("What time should I remind you? Send it as HH:MM, like 07:30."); });
export default composer;
