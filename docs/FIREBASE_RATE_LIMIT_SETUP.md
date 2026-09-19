# Firebase rate-limit setup

Caveman enforces the generation quota on the server: 8 README generations per authenticated
Firebase account in any rolling 15-hour window. Firestore stores the timestamps in
`rateLimits/{firebaseUid}`.

## Firebase Console

1. Create or select the Firebase project used by Caveman.
2. Open **Authentication → Sign-in method**, enable **Google**, and save.
3. Open **Authentication → Settings → Authorized domains** and add the Vercel domain, for example
   `caveman.vercel.app` and `caveman.runs-on.dev`.
4. Open **Firestore Database**, create the database, and choose a production location.
5. Open **Project settings → General**, register a Web app, and copy the six web config values.
6. Open **Project settings → Service accounts**, choose **Generate new private key**, and download
   the JSON file. Treat it as a password.

## Vercel environment variables

In Vercel, open **Project → Settings → Environment Variables** and add each variable to the
Production environment (also add Preview/Development if those deployments need generation):

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
USER_RATE_LIMIT=8
REQUIRE_DURABLE_RATE_LIMIT=true
```

Paste the complete service-account JSON into `FIREBASE_SERVICE_ACCOUNT_JSON` as one environment
variable. Do not add `VITE_` to it. Vercel encrypts environment variables, but the value should
still never be committed to Git.

The app also supports these server-only variables instead of the JSON form:

```dotenv
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-....@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The JSON form is recommended because it avoids copying the private key incorrectly.
If a hosting provider changes the JSON formatting, base64-encode the complete file and use
`FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` instead of `FIREBASE_SERVICE_ACCOUNT_JSON`.

## Deploy and verify

1. Save the Vercel variables and redeploy the project.
2. Sign in with Google and generate a README.
3. In Firestore, confirm a document appears at `rateLimits/{uid}`. It contains server-managed
   timestamps; do not allow clients to write it.
4. Generate until the eighth successful request. The ninth request must return the cooldown with
   the timestamp of the oldest request plus 15 hours.
5. Check Vercel logs for `rate_limit_denied` if the limit is reached.

The server uses the Firebase UID, not a client-provided email string. For this app's Google-only
sign-in, that gives one stable quota per Gmail/Google account across devices. The local browser
counter is only a convenience display; clearing storage cannot reset the Firestore quota.

If Firebase Admin is unavailable, generation still works with the same 8/15-hour rules in memory,
but the quota is per Vercel instance and can reset after a cold start. Firestore is used
automatically whenever valid Admin credentials are available.

## Optional App Check hardening

For additional bot protection, register the web app under **App Check**, create a reCAPTCHA v3
site key, set `VITE_RECAPTCHA_SITE_KEY`, and then set `ENFORCE_APP_CHECK=true` in Vercel. Redeploy
after both variables are present.
