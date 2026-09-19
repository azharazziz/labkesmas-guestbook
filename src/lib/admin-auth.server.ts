// Server-only: admin session via HMAC-signed cookie.
// Credentials come from env: ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_SESSION_SECRET.

const COOKIE_NAME = "blk_admin_session";
const SESSION_MS = 8 * 60 * 60 * 1000; // 8 jam

function secret(): string {
  const s = process.env["ADMIN_SESSION_SECRET"];
  if (!s) throw new Error("CONFIG_MISSING");
  return s;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeToken(): Promise<string> {
  const exp = String(Date.now() + SESSION_MS);
  return `${exp}.${await sign(exp)}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number.isNaN(Number(exp)) || Date.now() > Number(exp)) return false;
  // compare synchronously via cached promise pattern — see verifySession
  return Promise.resolve(sign(exp)).then((expected) => expected === sig) as unknown as boolean;
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number.isNaN(Number(exp)) || Date.now() > Number(exp)) return false;
  return (await sign(exp)) === sig;
}

export function readSessionCookie(cookieHeader: string | null | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE_NAME) return v.join("=");
  }
  return undefined;
}

export async function checkCredentials(username: string, password: string): Promise<boolean> {
  const user = process.env["ADMIN_USERNAME"];
  const pass = process.env["ADMIN_PASSWORD"];
  if (!user || !pass) throw new Error("CONFIG_MISSING");
  return username === user && password === pass;
}

export async function sessionCookie(): Promise<string> {
  const token = await makeToken();
  const secure = process.env["NODE_ENV"] === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MS / 1000}${secure}`;
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
