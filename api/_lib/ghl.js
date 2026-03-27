/**
 * PeakHer GHL (GoHighLevel) Integration
 *
 * Creates contacts and sends emails via GHL API v2.
 * Uses GHL_PEAKHER_API_KEY + GHL_PEAKHER_LOCATION_ID env vars.
 */

var GHL_BASE = 'https://services.leadconnectorhq.com';

function getConfig() {
  var apiKey = process.env.GHL_PEAKHER_API_KEY;
  var locationId = process.env.GHL_PEAKHER_LOCATION_ID;
  if (!apiKey || !locationId) {
    return null;
  }
  return { apiKey: apiKey, locationId: locationId };
}

function getHeaders(apiKey) {
  return {
    'Authorization': 'Bearer ' + apiKey,
    'Content-Type': 'application/json',
    'Version': '2021-07-28'
  };
}

/**
 * Find a GHL contact by email. Returns contact object or null.
 */
async function findContactByEmail(email) {
  var config = getConfig();
  if (!config) return null;

  var url = GHL_BASE + '/contacts/search/duplicate?locationId=' + config.locationId + '&email=' + encodeURIComponent(email);
  var resp = await fetch(url, {
    method: 'GET',
    headers: getHeaders(config.apiKey)
  });

  if (!resp.ok) {
    var errText = await resp.text();
    console.error('GHL findContact error:', resp.status, errText);
    return null;
  }

  var data = await resp.json();
  // v2 API returns { contact: {...} } or empty
  if (data.contact && data.contact.id) {
    return data.contact;
  }
  return null;
}

/**
 * Create or update a GHL contact.
 * Returns { id, isNew } or null on failure.
 */
async function upsertContact(options) {
  var config = getConfig();
  if (!config) {
    console.warn('GHL: not configured, skipping contact creation');
    return null;
  }

  var body = {
    locationId: config.locationId,
    email: options.email,
    firstName: options.firstName || '',
    tags: options.tags || [],
    source: options.source || 'PeakHer App'
  };

  if (options.lastName) body.lastName = options.lastName;
  if (options.phone) body.phone = options.phone;
  if (options.customFields) body.customField = options.customFields;

  var resp = await fetch(GHL_BASE + '/contacts/', {
    method: 'POST',
    headers: getHeaders(config.apiKey),
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    // If contact already exists (400/409), try to find it
    var errText = await resp.text();
    console.warn('GHL upsertContact create failed (' + resp.status + '), looking up existing contact');
    var existing = await findContactByEmail(options.email);
    if (existing) {
      return { id: existing.id, isNew: false };
    }
    console.error('GHL upsertContact error: could not create or find contact', errText);
    return null;
  }

  var data = await resp.json();
  var contact = data.contact || data;
  return {
    id: contact.id,
    isNew: data.isNew !== false
  };
}

/**
 * Add tags to an existing GHL contact.
 */
async function addTags(contactId, tags) {
  var config = getConfig();
  if (!config) return null;

  var resp = await fetch(GHL_BASE + '/contacts/' + contactId + '/tags', {
    method: 'POST',
    headers: getHeaders(config.apiKey),
    body: JSON.stringify({ tags: tags })
  });

  if (!resp.ok) {
    var errText = await resp.text();
    console.error('GHL addTags error:', resp.status, errText);
    return null;
  }

  return resp.json();
}

/**
 * Send an email to a GHL contact via conversations API.
 * Requires the contact to already exist in GHL.
 */
async function sendEmail(contactId, subject, html) {
  var config = getConfig();
  if (!config) {
    console.warn('GHL: not configured, skipping email send');
    return { skipped: true };
  }

  var resp = await fetch(GHL_BASE + '/conversations/messages', {
    method: 'POST',
    headers: getHeaders(config.apiKey),
    body: JSON.stringify({
      type: 'Email',
      contactId: contactId,
      subject: subject,
      html: html,
      locationId: config.locationId
    })
  });

  if (!resp.ok) {
    var errText = await resp.text();
    console.error('GHL sendEmail error:', resp.status, errText);
    throw new Error('GHL email send failed: ' + resp.status);
  }

  return resp.json();
}

/**
 * Convenience: find or create contact, then send email.
 * This is the main function most callers should use.
 */
async function sendEmailToAddress(email, subject, html, contactOptions) {
  var config = getConfig();
  if (!config) {
    console.warn('GHL: not configured, skipping email');
    return { skipped: true };
  }

  // Find existing contact or create one
  var contact = await findContactByEmail(email);
  var contactId;

  if (contact) {
    contactId = contact.id;
  } else {
    var result = await upsertContact({
      email: email,
      firstName: (contactOptions && contactOptions.firstName) || '',
      tags: (contactOptions && contactOptions.tags) || ['peakher_user'],
      source: 'PeakHer App'
    });
    if (!result) {
      console.error('GHL: failed to create contact for', email);
      throw new Error('Failed to create GHL contact');
    }
    contactId = result.id;
  }

  return sendEmail(contactId, subject, html);
}

module.exports = {
  findContactByEmail: findContactByEmail,
  upsertContact: upsertContact,
  addTags: addTags,
  sendEmail: sendEmail,
  sendEmailToAddress: sendEmailToAddress,
  getConfig: getConfig
};
