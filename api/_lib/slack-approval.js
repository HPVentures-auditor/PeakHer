/**
 * PeakHer Slack Approval Helper
 *
 * Mirrors the Mpenda Slack approval pattern for outbound nurture messages.
 * Posts a Block Kit card with Approve / Reject buttons to a Slack channel,
 * then updates the card in place after a decision is made.
 *
 * Env vars:
 *   - SLACK_BOT_TOKEN:      xoxb- bot token used to post and update messages
 *   - SLACK_APPROVAL_CHANNEL: channel ID (e.g. C0123ABCDE) where cards post
 *   - SLACK_SIGNING_SECRET: used by the interactions webhook to verify payloads
 *
 * If SLACK_BOT_TOKEN or SLACK_APPROVAL_CHANNEL is missing, posts are skipped
 * quietly so the waitlist flow still works in dev.
 */

var SLACK_API = 'https://slack.com/api';

function getConfig() {
  var token = process.env.SLACK_BOT_TOKEN;
  var channel = process.env.SLACK_APPROVAL_CHANNEL;
  if (!token || !channel) return null;
  return { token: token, channel: channel };
}

function slackHeaders(token) {
  return {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function stripHtml(s) {
  if (!s) return '';
  return String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '...' : s;
}

/**
 * Build Block Kit blocks for a draft approval card.
 */
function buildApprovalBlocks(message) {
  var body = truncate(stripHtml(message.body), 2500);

  var blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'PeakHer Nurture - ' + (message.template_key || 'message')
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: '*Contact:*\n' + (message.first_name ? message.first_name + ' <' + message.email + '>' : message.email) },
        { type: 'mrkdwn', text: '*Source:*\n' + (message.source || 'unknown') },
        { type: 'mrkdwn', text: '*Template:*\n' + (message.template_key || '-') },
        { type: 'mrkdwn', text: '*Status:*\n`DRAFT`' }
      ]
    }
  ];

  if (message.subject) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*Subject:* ' + message.subject }
    });
  }

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: '```' + body + '```' }
  });

  blocks.push({
    type: 'actions',
    block_id: 'nurture_actions_' + message.id,
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Approve & Send' },
        style: 'primary',
        action_id: 'approve_msg_' + message.id,
        value: String(message.id)
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Reject' },
        style: 'danger',
        action_id: 'reject_msg_' + message.id,
        value: String(message.id)
      }
    ]
  });

  blocks.push({ type: 'divider' });
  return blocks;
}

/**
 * Build Block Kit blocks for a card that has been acted on (no buttons).
 */
function buildStatusBlocks(message, status) {
  var body = truncate(stripHtml(message.body), 2500);

  var statusLine;
  if (status === 'approved' || status === 'sent') {
    statusLine = ':white_check_mark: *SENT*';
  } else if (status === 'rejected') {
    statusLine = ':x: *REJECTED*';
  } else if (status === 'failed') {
    statusLine = ':warning: *FAILED*';
  } else {
    statusLine = '*' + String(status).toUpperCase() + '*';
  }

  var byLine = message.approved_by ? '\n_by ' + message.approved_by + '_' : '';

  var blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'PeakHer Nurture - ' + (message.template_key || 'message')
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: '*Contact:*\n' + (message.first_name ? message.first_name + ' <' + message.email + '>' : message.email) },
        { type: 'mrkdwn', text: '*Source:*\n' + (message.source || 'unknown') },
        { type: 'mrkdwn', text: '*Status:*\n' + statusLine + byLine },
        { type: 'mrkdwn', text: '*Template:*\n' + (message.template_key || '-') }
      ]
    }
  ];

  if (message.subject) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*Subject:* ' + message.subject }
    });
  }

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: '```' + body + '```' }
  });

  if (message.error) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: ':warning: ' + truncate(message.error, 400) }]
    });
  }

  blocks.push({ type: 'divider' });
  return blocks;
}

/**
 * Post a Block Kit approval card to the configured Slack channel.
 * Returns the Slack message timestamp (ts) or null if Slack is not configured
 * or the post fails.
 */
async function postApprovalCard(message) {
  var config = getConfig();
  if (!config) {
    console.warn('Slack: SLACK_BOT_TOKEN / SLACK_APPROVAL_CHANNEL not set; skipping approval card');
    return null;
  }

  var blocks = buildApprovalBlocks(message);
  var fallback = 'New PeakHer opt-in for ' + (message.email || 'unknown') + ' (' + (message.template_key || 'nurture') + ')';

  try {
    var resp = await fetch(SLACK_API + '/chat.postMessage', {
      method: 'POST',
      headers: slackHeaders(config.token),
      body: JSON.stringify({
        channel: config.channel,
        text: fallback,
        blocks: blocks
      })
    });
    var data = await resp.json();
    if (!data.ok) {
      console.error('Slack postMessage error:', data.error, data);
      return null;
    }
    return data.ts || null;
  } catch (err) {
    console.error('Slack postApprovalCard exception:', err.message);
    return null;
  }
}

/**
 * Update an existing approval card to reflect a terminal status.
 * Requires the message to already have slack_message_ts set.
 */
async function updateApprovalCard(message, status) {
  var config = getConfig();
  if (!config) return null;
  if (!message.slack_message_ts) return null;

  var blocks = buildStatusBlocks(message, status);
  var fallback = 'PeakHer nurture ' + status + ' for ' + (message.email || 'unknown');

  try {
    var resp = await fetch(SLACK_API + '/chat.update', {
      method: 'POST',
      headers: slackHeaders(config.token),
      body: JSON.stringify({
        channel: config.channel,
        ts: message.slack_message_ts,
        text: fallback,
        blocks: blocks
      })
    });
    var data = await resp.json();
    if (!data.ok) {
      console.error('Slack chat.update error:', data.error, data);
      return null;
    }
    return data.ts || message.slack_message_ts;
  } catch (err) {
    console.error('Slack updateApprovalCard exception:', err.message);
    return null;
  }
}

/**
 * Verify a Slack request signature. See:
 *   https://api.slack.com/authentication/verifying-requests-from-slack
 *
 * rawBody must be the exact bytes of the request body.
 */
function verifySlackSignature(rawBody, timestamp, signature) {
  var secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) {
    console.warn('Slack: SLACK_SIGNING_SECRET not set; rejecting signature verification');
    return false;
  }
  if (!timestamp || !signature) return false;

  // Reject replays older than 5 minutes
  var nowSec = Math.floor(Date.now() / 1000);
  var tsNum = parseInt(timestamp, 10);
  if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > 60 * 5) {
    return false;
  }

  var crypto = require('crypto');
  var base = 'v0:' + timestamp + ':' + rawBody;
  var expected = 'v0=' + crypto.createHmac('sha256', secret).update(base).digest('hex');

  var a;
  var b;
  try {
    a = Buffer.from(expected, 'utf8');
    b = Buffer.from(signature, 'utf8');
  } catch (e) {
    return false;
  }
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

module.exports = {
  postApprovalCard: postApprovalCard,
  updateApprovalCard: updateApprovalCard,
  verifySlackSignature: verifySlackSignature,
  buildApprovalBlocks: buildApprovalBlocks,
  buildStatusBlocks: buildStatusBlocks,
  getConfig: getConfig
};
