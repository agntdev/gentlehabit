import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { profile } from "../habits.js";
import { inlineButton, inlineKeyboard, mainMenuKeyboard } from "../toolkit/index.js";

// The /start handler renders the bot's MAIN MENU — the primary way users operate
// a button-first bot. A feature adds its own button by calling
// `registerMainMenuItem(...)` in its own `src/handlers/<slug>.ts`; this handler
// renders whatever is registered (plus a Help button), so you do NOT edit this
// file to add a feature. Send ONE message — no placeholder line above the menu.
const composer = new Composer<Ctx>();

const WELCOME = "Your habits have a quiet place here. Choose what you need today.";

composer.command("start", async (ctx) => {
  const p = profile(ctx.session);
  if (!p) {
    await ctx.reply("Welcome. Let’s begin by setting your time zone, so reminders arrive at a good time for you.", {
      reply_markup: inlineKeyboard([[inlineButton("Set time zone", "habit:timezone")], [inlineButton("Create habit", "habit:create")], [inlineButton("Help", "menu:help")]]),
    });
    return;
  }
  const active = p.habits.filter((h) => h.active).length;
  await ctx.reply(active ? `${WELCOME}\n\nYou have ${active} active habit${active === 1 ? "" : "s"}.` : "Your habits are paused or waiting to be created. Choose a gentle next step.", { reply_markup: mainMenuKeyboard() });
});

// "Back to menu" — re-render the main menu in place from any sub-view.
composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
