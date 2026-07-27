# Private Habit Tracker — Bot specification

**Archetype:** custom

**Voice:** calm and encouraging — write every user-facing message, button label, error, and empty state in this voice.

A minimalist Telegram bot for tracking personal habits with custom schedules, one-tap daily check-ins, and milestone celebrations. Tracks streaks, completion rates, and provides weekly recaps while maintaining strict user privacy.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- individual users
- habit builders
- productivity-focused individuals

## Success criteria

- users complete 70%+ of scheduled check-ins monthly
- weekly recap viewed by 80% of active users
- milestone notifications triggered for 500+ users in first month

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with habit overview and quick actions
- **Create New Habit** (button, actor: user, callback: habit:create) — Launch guided habit creation flow
  - inputs: habit name, schedule type, reminder time
  - outputs: new habit record
- **Check In Now** (button, actor: user, callback: checkin:now) — Mark current habit as done
  - inputs: habit ID
  - outputs: check-in record
- **/stats** (command, actor: user, command: /stats) — Show current streaks and metrics

## Flows

### onboarding
_Trigger:_ /start

1. detect time zone
2. create first habit
3. set initial reminder

_Data touched:_ User, Habit

### daily_checkin
_Trigger:_ scheduled reminder

1. send reminder message
2. display Done/Skip/Later buttons
3. record check-in status

_Data touched:_ Check-in, Streaks

### weekly_recap
_Trigger:_ every Sunday at 8AM local time

1. generate 7-day grid summary
2. show completion rates
3. send encouraging note

_Data touched:_ Check-in, Streaks

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram account with time zone preference
  - fields: telegram_id, time_zone, notification_prefs
- **Habit** _(retention: persistent)_ — User-created habit with custom schedule
  - fields: name, schedule_type, reminder_time, active_status
- **Check-in** _(retention: persistent)_ — Daily habit status recording
  - fields: date, status, habit_id, user_id
- **Streaks** _(retention: persistent)_ — Tracking metrics for habit consistency
  - fields: current_streak, longest_streak, completion_rate

## Integrations

- **Telegram** (required) — Bot API messaging
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- create/edit/delete habits
- pause/resume habits
- adjust time zone
- view weekly recaps
- toggle milestone notifications

## Notifications

- daily reminder at scheduled local time
- milestone celebration with image
- weekly recap summary

## Permissions & privacy

- All user data is private and not shared with other users
- Check-in history stored securely per user
- No third-party data sharing by default

## Edge cases

- Time zone changes mid-streak
- Multiple check-in attempts within grace period
- Missed check-ins detected at day end

## Required tests

- End-to-end check-in flow with snooze and milestone triggering
- Weekly recap generation with sample data
- Time zone handling across DST transitions

## Assumptions

- Users will maintain consistent time zone settings
- Milestone thresholds (7,21,30) are sufficient motivation
- One-tap check-ins prevent accidental double-counting
