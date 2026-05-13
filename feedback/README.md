# Feedback → Google Sheet (5-min setup)

The `✉` floating button in the dashboard POSTs feedback to a Google Apps Script Web App, which appends one row per submission to a Google Sheet you control. Share that Sheet with developers — they get an inbox without you opening GitHub issues.

## One-time setup

### 1. Create the Sheet

[sheets.new](https://sheets.new) → name it "Option Panda Feedback" (or whatever). Add a header row in row 1:

```
timestamp | type | subject | body | version | activeTab | userAgent
```

(The script writes columns in this order; the header is for your eyes.)

### 2. Add the Apps Script

In that sheet: **Extensions → Apps Script**. Replace the default code with:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSheet();
    sheet.appendRow([
      data.submittedAt || new Date().toISOString(),
      data.type || '',
      data.subject || '',
      data.body || '',
      data.version || '',
      data.activeTab || '',
      data.userAgent || ''
    ]);
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false, error: String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}
```

Save (give it a name like "Feedback Sink").

### 3. Deploy as Web App

**Deploy → New deployment → ⚙ → Web app**:

- Description: `Feedback webhook v1`
- Execute as: **Me**
- Who has access: **Anyone**  *(required — your dashboard runs in the browser without Google auth)*

Click **Deploy**, authorize when prompted. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`).

### 4. Paste it into the dashboard

Open the dashboard → **ALERTS tab** → **FEEDBACK WEBHOOK card** → paste the URL → **SAVE**. Click **▶ SEND TEST** to confirm a row appears in the Sheet.

### 5. Share the Sheet

Standard Google Sheets share — give read access (or comment/edit, your call) to whoever you want to triage feedback. They'll see new submissions as rows appear.

## Optional: bake the URL in as the DEFAULT for every visitor

If you want **every** user of the public dashboard to submit feedback into your Sheet without each one configuring their own, paste the URL into the dashboard source as the default webhook:

1. Open `index.html`
2. Find the line `var FEEDBACK_DEFAULT_WEBHOOK = '';` (near the `APP_VERSION` constant)
3. Paste your Apps Script URL between the quotes:

   ```javascript
   var FEEDBACK_DEFAULT_WEBHOOK = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```

4. Commit + push. The new build serves the URL as the default; the `localStorage` value still wins for any user who's set their own.

**Security note:** the URL is public in the page source. The Apps Script only ACCEPTS POSTs that append to the Sheet — no other operations are exposed. If spam ever becomes a problem, add the shared-secret check below.

## Optional: get a Gmail notification on every submission

Update your Apps Script with one extra line so every submission also emails you:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSheet();
    sheet.appendRow([
      data.submittedAt || new Date().toISOString(),
      data.type || '',
      data.subject || '',
      data.body || '',
      data.version || '',
      data.activeTab || '',
      data.userAgent || ''
    ]);
    // Optional: notify yourself on every submission.
    try {
      MailApp.sendEmail({
        to: 'alexander.s.reed@gmail.com',
        subject: '[Option Panda Feedback] ' + (data.type||'other') + ': ' + (data.subject||'(no subject)'),
        body: 'Type: ' + (data.type||'') + '\n'
            + 'Subject: ' + (data.subject||'') + '\n'
            + 'Submitted: ' + (data.submittedAt||'') + '\n'
            + 'Version: ' + (data.version||'') + '\n'
            + 'Tab: ' + (data.activeTab||'') + '\n\n'
            + (data.body || '') + '\n\n'
            + '— sent automatically by your feedback webhook'
      });
    } catch (_) { /* email is best-effort; rows still land in the Sheet */ }
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false, error: String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}
```

After editing, redeploy (Deploy → Manage deployments → ✎ → New version → Deploy). The URL stays the same. Apps Script's free `MailApp` quota is 100 emails/day for a personal Gmail account — more than enough for feedback volume.

## Optional: shared secret to block random POSTs

If the URL is baked into the public dashboard and bots eventually find it:

1. Add a constant at the top of the Apps Script: `var SHARED_SECRET = 'pick-a-random-string-32chars-or-so';`
2. In the dashboard's `submitFeedback` payload (line ~5784 in `index.html`), add: `secret: 'same-random-string'`
3. In `doPost`, reject mismatches: `if (data.secret !== SHARED_SECRET) return ContentService.createTextOutput('forbidden');`

This isn't crypto-grade auth — anyone who reads the dashboard source can copy the secret — but it stops drive-by bot abuse.

## Notes / caveats

- **Updating the script:** if you change the Apps Script later, you need to redeploy (Deploy → Manage deployments → ✎ on the active deployment → New version → Deploy). The URL stays the same.
- **CORS:** the dashboard sends with `mode:'no-cors'` and `Content-Type:'text/plain'` to avoid Apps Script's preflight quirk. You can't read the response status, but Apps Script logs failures in **Executions** (left sidebar in the script editor) if rows aren't landing.
- **Rate limits:** Apps Script Web Apps cap at ~20k POSTs/day (free tier). Way more than you'll ever hit personally.
- **Privacy:** the dashboard sends `userAgent` (browser version) and `version` (app version) automatically. No account info, no positions, no API keys.
