// Server-only: read the header row and append rows to the configured Google Sheet.
import { getAccessToken } from "./google-auth.server";

const API = "https://sheets.googleapis.com/v4/spreadsheets";

function config() {
  const spreadsheetId = process.env["GOOGLE_SHEETS_ID"];
  const sheetName = process.env["GOOGLE_SHEET_NAME"] || "Sheet1";
  if (!spreadsheetId) throw new Error("CONFIG_MISSING");
  return { spreadsheetId, sheetName };
}

function quoted(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

async function call(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const res = await fetch(`${API}/${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });
  if (!res.ok) {
    console.error("Sheets API error", res.status, await res.text());
    throw new Error(res.status === 403 || res.status === 404 ? "SHEET_ACCESS" : "SHEET_ERROR");
  }
  return res.json();
}

export async function readHeaders(): Promise<string[]> {
  const { spreadsheetId, sheetName } = config();
  const json = (await call(
    `${spreadsheetId}/values/${quoted(sheetName)}!1:1?majorDimension=ROWS`,
  )) as { values?: string[][] };
  return (json.values?.[0] ?? []).map((v) => String(v ?? ""));
}

export async function appendRow(row: string[]): Promise<void> {
  const { spreadsheetId, sheetName } = config();
  await call(
    `${spreadsheetId}/values/${quoted(sheetName)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [row] }) },
  );
}
