# YouTube Integration – How to Get the Keys

This guide walks you through getting **Google OAuth credentials** so organizations can **Connect with YouTube** on the Integrations page. No manual channel URL—one click to connect.

---

## 1. Open Google Cloud Console

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Sign in with the Google account you use for development (or your org’s account).

---

## 2. Create or Select a Project

1. In the top bar, click the **project dropdown** (next to “Google Cloud”).
2. Either:
   - Click **“New Project”** → give it a name (e.g. “Believe Wallet”) → **Create**, or  
   - Select an **existing project** you already use for this app.
3. Make sure that project is **selected** (shown in the top bar).

---

## 3. Enable YouTube Data API v3

1. In the left menu go to: **APIs & Services** → **Library** (or open [API Library](https://console.cloud.google.com/apis/library)).
2. Search for **“YouTube Data API v3”**.
3. Click it, then click **“Enable”**.

---

## 4. Create OAuth Consent Screen (if not done yet)

1. Go to **APIs & Services** → **OAuth consent screen** (or [direct link](https://console.cloud.google.com/apis/credentials/consent)).
2. Choose **External** (so any Google user can sign in) → **Create**.
3. Fill only the **required** fields:
   - **App name:** e.g. “Believe Wallet”
   - **User support email:** your email
   - **Developer contact email:** your email
4. Click **Save and Continue**.
5. **Scopes:** click **Add or Remove Scopes** → search for **“YouTube Data API v3”** → add:
   - `https://www.googleapis.com/auth/youtube.readonly`
   - (or “See your YouTube account”, read-only)
6. **Save and Continue**.
7. **Test users (optional):** if the app is in “Testing”, add the Gmail addresses that will use “Connect with YouTube”. Later you can submit for verification.
8. **Save and Continue** until you’re back on the consent screen.

---

## 5. Create OAuth 2.0 Credentials (Client ID & Secret)

1. Go to **APIs & Services** → **Credentials** (or [Credentials](https://console.cloud.google.com/apis/credentials)).
2. Click **“+ Create Credentials”** → **“OAuth client ID”**.
3. **Application type:** choose **“Web application”**.
4. **Name:** e.g. “Believe Wallet – YouTube”.
5. **Authorized redirect URIs** – click **“Add URI”** and add **exactly** (no trailing slash, exact scheme and host):
   - **Local:**  
     `http://127.0.0.1:8000/integrations/youtube/callback`  
     or `http://localhost:8000/integrations/youtube/callback` (match whatever your `APP_URL` is in `.env`)
   - **Production:**  
     `https://believeinunity.com/integrations/youtube/callback`  
     (or your real domain – must match `APP_URL` or `YOUTUBE_REDIRECT_URI` in `.env`)

   **If you see “Error 400: redirect_uri_mismatch”:** The URL your app sends to Google must be **identical** to one of these. On the Integrations → YouTube page we show the exact redirect URI the app uses – copy that and add it in Google Console.
6. Click **Create**.
7. A popup will show:
   - **Client ID** (long string ending in `.apps.googleusercontent.com`)
   - **Client secret**
8. Copy both; you’ll put them in `.env` next.

---

## 6. Put the Keys in Your App

In your project’s **`.env`** (in the `backend` folder), add or edit:

```env
# YouTube Integration (OAuth – Connect with YouTube button)
YOUTUBE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret_here

# Optional: only if your callback URL is different from APP_URL + /integrations/youtube/callback
# YOUTUBE_REDIRECT_URI=https://yourdomain.com/integrations/youtube/callback
```

- **Local:** if `APP_URL` in `.env` is `http://localhost:8000`, you usually **don’t** need `YOUTUBE_REDIRECT_URI`; the app will use `APP_URL + /integrations/youtube/callback`.
- **Production:** set `APP_URL` to your real URL (e.g. `https://yourdomain.com`) and ensure the **exact same** URL is added in Google Console under “Authorized redirect URIs”.

---

## 7. Optional – Reuse Gmail / Google Keys

If you already have **Gmail** or another Google OAuth app in the **same** Google Cloud project:

- You can reuse the **same** Client ID and Secret and only add the new redirect URI:
  - Edit the existing **OAuth 2.0 Client ID** (Web application).
  - Under **Authorized redirect URIs**, add:
    - `http://localhost:8000/integrations/youtube/callback`
    - `https://yourdomain.com/integrations/youtube/callback`
- Then in `.env` you can use either:
  - `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`, or  
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (the app falls back to these if the YouTube ones are not set).

---

## 8. YouTube Data API key (for showing channel videos)

The **Connect with YouTube** button only needs the **OAuth** client ID/secret above.

To **show that channel’s videos** on the Community Videos page, the app also uses the **YouTube Data API** with an **API key**:

1. In Google Cloud Console: **APIs & Services** → **Credentials**.
2. **Create Credentials** → **API key**.
3. Copy the key and in `.env` set:
   ```env
   YOUTUBE_API_KEY=your_api_key_here
   ```
   or (if you already use it in the frontend):
   ```env
   VITE_YOUTUBE_API_KEY=your_api_key_here
   ```
   The app will use `YOUTUBE_API_KEY` or `VITE_YOUTUBE_API_KEY` for fetching channel videos.

---

## Quick checklist

- [ ] Google Cloud project created/selected  
- [ ] YouTube Data API v3 enabled  
- [ ] OAuth consent screen configured (with `youtube.readonly` scope)  
- [ ] OAuth 2.0 Client ID (Web application) created  
- [ ] Redirect URI added: `https://yourdomain.com/integrations/youtube/callback` (and localhost if needed)  
- [ ] `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` in `.env`  
- [ ] (Optional) `YOUTUBE_API_KEY` or `VITE_YOUTUBE_API_KEY` in `.env` for loading channel videos  

After that, **Connect with YouTube** on `/integrations/youtube` will work: one click, sign in with Google, channel is linked.

---

## SSL certificate error (cURL error 60) on Windows / local

If you see **"cURL error 60: SSL certificate problem: unable to get local issuer certificate"** when Google redirects back to your callback:

- **Local dev:** The app disables SSL verification for outbound HTTPS requests when `APP_ENV=local`, so it should work without changes.
- **Production or if you prefer to keep verification:**  
  1. Download the CA bundle: [https://curl.se/ca/cacert.pem](https://curl.se/ca/cacert.pem)  
  2. Save it (e.g. `backend/cacert.pem`).  
  3. In `.env` set: `CURL_CA_BUNDLE=/absolute/path/to/cacert.pem`  
  Or set in `php.ini`: `curl.cainfo = "C:\path\to\cacert.pem"` (Windows) or `curl.cainfo = "/path/to/cacert.pem"` (Linux/macOS).
