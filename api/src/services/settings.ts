import { execute, queryOne, type RowDataPacket } from "../db.js";
import { normaliseRate } from "../lib/tax.js";

/**
 * New York City's combined sales tax: 4% state, 4.5% city, 0.375% MCTD. The
 * default until an operator saves another rate on the Settings page.
 */
export const DEFAULT_TAX_RATE = 8.875;

export type Settings = {
  /** Percentage applied to every new order. Each order keeps its own copy. */
  taxRate: number;
  taxRateUpdatedAt: string | null;
};

type SettingRow = RowDataPacket & { value: string; updated_at: Date };

async function readSetting(name: string): Promise<SettingRow | null> {
  return queryOne<SettingRow>(`SELECT value, updated_at FROM settings WHERE name = :name`, { name });
}

/** The rate a new order is charged. Read on every new order, never cached. */
export async function getDefaultTaxRate(): Promise<number> {
  const row = await readSetting("tax_rate");
  const rate = row ? Number(row.value) : NaN;
  return Number.isFinite(rate) ? rate : DEFAULT_TAX_RATE;
}

export async function getSettings(): Promise<Settings> {
  const row = await readSetting("tax_rate");
  const rate = row ? Number(row.value) : NaN;
  return {
    taxRate: Number.isFinite(rate) ? rate : DEFAULT_TAX_RATE,
    taxRateUpdatedAt: row ? row.updated_at.toISOString() : null,
  };
}

/** Changes the default for orders made from now on. Existing orders keep theirs. */
export async function setDefaultTaxRate(rate: number, adminUserId: number): Promise<Settings> {
  await execute(
    `INSERT INTO settings (name, value, updated_by)
     VALUES ('tax_rate', :value, :adminUserId)
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by)`,
    { value: String(normaliseRate(rate)), adminUserId },
  );
  return getSettings();
}
