/**
 * PeakHer Claude API Module: Anthropic integration
 *
 * Thin HTTP wrapper (no SDK). Same pattern as email.js.
 * Requires ANTHROPIC_API_KEY env var.
 */

var API_URL = 'https://api.anthropic.com/v1/messages';
var DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
var API_VERSION = '2023-06-01';

function getApiKey() {
  return process.env.ANTHROPIC_API_KEY || null;
}

function getModel() {
  return process.env.CLAUDE_MODEL || DEFAULT_MODEL;
}

/**
 * Send a message to Claude and get a response.
 * @param {Object} options
 * @param {string} options.system - System prompt
 * @param {string} options.userMessage - User message content
 * @param {number} [options.maxTokens=2048] - Max response tokens
 * @param {number} [options.temperature=0] - Sampling temperature
 * @returns {Promise<{content: string, model: string, inputTokens: number, outputTokens: number}>}
 */
async function sendMessage(options) {
  var apiKey = getApiKey();
  if (!apiKey) {
    console.warn('PeakHer Claude: ANTHROPIC_API_KEY not set, skipping AI call');
    return { skipped: true };
  }

  var model = getModel();
  var maxTokens = options.maxTokens || 2048;
  var temperature = options.temperature !== undefined ? options.temperature : 0;

  var body = {
    model: model,
    max_tokens: maxTokens,
    temperature: temperature,
    messages: [
      { role: 'user', content: options.userMessage }
    ]
  };

  if (options.system) {
    body.system = options.system;
  }

  var resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    var errorBody = await resp.text();
    console.error('PeakHer Claude: API error', resp.status, errorBody);
    throw new Error('Claude API call failed: ' + resp.status);
  }

  var data = await resp.json();

  var textContent = '';
  if (data.content && data.content.length > 0) {
    for (var i = 0; i < data.content.length; i++) {
      if (data.content[i].type === 'text') {
        textContent += data.content[i].text;
      }
    }
  }

  return {
    content: textContent,
    model: data.model || model,
    inputTokens: data.usage ? data.usage.input_tokens : 0,
    outputTokens: data.usage ? data.usage.output_tokens : 0
  };
}

module.exports = {
  sendMessage: sendMessage,
  getModel: getModel
};
