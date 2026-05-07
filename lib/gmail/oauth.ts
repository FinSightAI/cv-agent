import { google, type Auth } from "googleapis";

export const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

function appOrigin(): string {
  // Prefer explicit override, then VERCEL_URL (preview/prod), then localhost.
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function redirectUri(): string {
  return `${appOrigin()}/api/auth/google/callback`;
}

export function makeOAuthClient(): Auth.OAuth2Client {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Gmail integration not configured: set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET",
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri());
}

export function authUrl(state: string): string {
  const oauth = makeOAuthClient();
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // ensures refresh_token on every consent
    scope: SCOPES,
    state,
  });
}

export async function exchangeCode(code: string) {
  const oauth = makeOAuthClient();
  const { tokens } = await oauth.getToken(code);
  return tokens;
}

export function clientWithRefreshToken(refreshToken: string): Auth.OAuth2Client {
  const oauth = makeOAuthClient();
  oauth.setCredentials({ refresh_token: refreshToken });
  return oauth;
}
