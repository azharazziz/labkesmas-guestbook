// Server-only: read the header row, config sheet, and rows; append rows to the Google Sheet.
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

async function getValues(range: string): Promise<string[][]> {
  const { spreadsheetId } = config();
  const json = (await call(
    `${spreadsheetId}/values/${quoted(range)}?majorDimension=ROWS`,
  )) as { values?: string[][] };
  return (json.values ?? []).map((row) => row.map((v) => String(v ?? "")));
}

export async function readHeaders(): Promise<string[]> {
  const { sheetName } = config();
  const rows = await getValues(`${sheetName}!1:1`);
  return rows[0] ?? [];
}

export async function readAllRows(): Promise<{ headers: string[]; rows: string[][] }> {
  const { sheetName } = config();
  const values = await getValues(sheetName);
  return { headers: values[0] ?? [], rows: values.slice(1) };
}

/** Reads the optional "Konfigurasi Formulir" sheet. Returns null when it doesn't exist. */
export async function readConfigSheet(): Promise<Record<string, string>[] | null> {
  const name = process.env["GOOGLE_CONFIG_SHEET_NAME"] || "Konfigurasi Formulir";
  try {
    const values = await getValues(name);
    if (values.length < 2) return [];
    const cols = values[0].map((h) => h.trim().toLowerCase());
    return values
      .slice(1)
      .filter((row) => row.some((c) => c.trim()))
      .map((row) => {
        const obj: Record<string, string> = {};
        cols.forEach((c, i) => {
          obj[c] = row[i] ?? "";
          void obj[c];
        });
        return obj;
      });
  } catch {
    return null; // config sheet is optional
  }
}

export async function appendRow(row: string[]): Promise<void> {
  const { spreadsheetId, sheetName } = config();
  await call(
    `${spreadsheetId}/values/${quoted(sheetName)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [row] }) },
  );
}
