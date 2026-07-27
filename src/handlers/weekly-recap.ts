import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { dateInZone, now, profile } from "../habits.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
registerMainMenuItem({ label: "🗓 Weekly recap", data: "recap:show", order: 50 });
const composer = new Composer<Ctx>();
function recap(ctx: Ctx): string { const p = profile(ctx.session); if (!p?.habits.length) return "No weekly recap yet — create a habit and your week will appear here."; const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(now()); d.setUTCDate(d.getUTCDate() - (6 - i)); return dateInZone(d, p.timeZone); }); const total = p.habits.length * 7; const done = p.checkins.filter((c) => days.includes(c.date) && c.status === "done").length; const grid = days.map((d) => `${d.slice(5)} ${p.checkins.some((c) => c.date === d && c.status === "done") ? "✓" : "·"}`).join("  "); return `Your week: ${grid}\nYou completed ${done} of ${total} planned check-ins. Small steps still count.`; }
async function show(ctx: Ctx, edit = false) { const markup = inlineKeyboard([[inlineButton("Back to progress", "stats:show")], [inlineButton("Back to menu", "menu:main")]]); if (edit) await ctx.editMessageText(recap(ctx), { reply_markup: markup }); else await ctx.reply(recap(ctx), { reply_markup: markup }); }
composer.callbackQuery("recap:show", async (ctx) => { await ctx.answerCallbackQuery(); await show(ctx, true); });
export default composer;
