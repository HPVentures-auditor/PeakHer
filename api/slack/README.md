# Slack Approval Flow

The PeakHer waitlist opt-in uses a Slack approval step before any nurture
email goes out. New signups create a draft in the `nurture_queue` table and
post a Block Kit card with Approve / Reject buttons to a Slack channel.
Approving sends the email through GHL and updates the card in place.

## Files

- `api/waitlist.js` — queues the draft + posts the approval card
- `api/_lib/slack-approval.js` — Block Kit card builder + signature verify
- `api/slack/interactions.js` — webhook Slack calls when a button is clicked
- `scripts/migrate_nurture_queue.js` — DB migration for the queue table

## Required Vercel env vars

| Name                     | What it is                                                       |
| ------------------------ | ---------------------------------------------------------------- |
| `SLACK_BOT_TOKEN`        | `xoxb-...` bot token. Scopes: `chat:write` (add `chat:write.public` if posting to a channel the bot isn't in). |
| `SLACK_APPROVAL_CHANNEL` | Channel ID (e.g. `C0123ABCDE`) where approval cards post.        |
| `SLACK_SIGNING_SECRET`   | App signing secret. Used to verify `POST /api/slack/interactions` payloads. |

Also required (already set for PeakHer):

- `DATABASE_URL`
- `GHL_PEAKHER_API_KEY`, `GHL_PEAKHER_LOCATION_ID`

## Slack app configuration

1. Create a Slack app at https://api.slack.com/apps
2. Add bot token scopes: `chat:write` (and `chat:write.public` if needed)
3. Install the app to your workspace, copy the bot token to `SLACK_BOT_TOKEN`
4. Under **Basic Information**, copy the **Signing Secret** to `SLACK_SIGNING_SECRET`
5. Under **Interactivity & Shortcuts**, enable interactivity and set:
   - Request URL: `https://peakher.ai/api/slack/interactions`
6. Invite the bot to the approval channel (or use `chat:write.public`)
7. Copy the channel ID to `SLACK_APPROVAL_CHANNEL`

## First-time setup

```bash
node scripts/migrate_nurture_queue.js
```

## Operational notes

- If `SLACK_BOT_TOKEN` or `SLACK_APPROVAL_CHANNEL` is unset, the waitlist still
  works — drafts are written to `nurture_queue` but no Slack card is posted.
- The interactions endpoint always returns 200 on logic errors to prevent
  Slack retry storms. Errors are logged to Vercel function logs.
- Terminal statuses: `draft`, `approved`, `rejected`, `sent`, `failed`.
- Stale clicks (e.g. a button pressed after someone else already approved)
  are handled idempotently and the card is updated to current state.
