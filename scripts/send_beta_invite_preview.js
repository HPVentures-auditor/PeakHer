var fs = require('fs');
var path = require('path');

var envPath = path.resolve(__dirname, '..', '.env.production');
fs.readFileSync(envPath, 'utf8').split('\n').forEach(function (line) {
  var m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (!m) return;
  var val = m[2].trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[m[1]]) process.env[m[1]] = val;
});

var { betaInviteEmail } = require('../api/_lib/email');

var NAME = process.argv[2] || 'Jairek';
var TO = process.argv[3] || 'results@jairekrobbins.com';
var SPOTS = parseInt(process.argv[4] || '87', 10);

var tpl = betaInviteEmail(NAME, SPOTS);

var previewPath = path.resolve(__dirname, '..', 'beta-invite-preview.html');
fs.writeFileSync(previewPath, tpl.html);
console.log('Preview written:', previewPath);
console.log('Subject:', tpl.subject);

(async function () {
  var { sendEmail } = require('../api/_lib/email');
  try {
    var result = await sendEmail({ to: TO, subject: tpl.subject, html: tpl.html, firstName: NAME });
    console.log('Sent to', TO, '→', JSON.stringify(result).slice(0, 200));
  } catch (e) {
    console.error('Send failed:', e.message);
    process.exit(1);
  }
})();
