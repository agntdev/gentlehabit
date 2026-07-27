import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { metrics, profile } from "../habits.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
registerMainMenuItem({ label: "📈 Your progress", data: "stats:show", order: 30 });
const composer = new Composer<Ctx>();
function text(ctx: Ctx): string { const p = profile(ctx.session); if (!p?.habits.length) return "No habits yet — tap ➕ Create habit to begin."; return p.habits.map((h) => { const m = metrics(p, h); return `“${h.name}” — ${m.current}-day streak, ${m.rate}% completed`; }).join("\n"); }
async function show(ctx: Ctx, edit = false) { const markup = inlineKeyboard([[inlineButton("View weekly recap", "recap:show")], [inlineButton("Manage habits", "habits:manage")], [inlineButton("Back to menu", "menu:main")]]); if (edit) await ctx.editMessageText(text(ctx), { reply_markup: markup }); else await ctx.reply(text(ctx), { reply_markup: markup }); }
composer.command("stats", async (ctx) => { await show(ctx); });
composer.callbackQuery("stats:show", async (ctx) => { await ctx.answerCallbackQuery(); await show(ctx, true); });
export default composer;
