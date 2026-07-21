import { describe, it, expect } from "vitest";
import { serializeBackup, parseBackup, BACKUP_VERSION, type BackupData } from "./backup";

function emptyData(): BackupData {
  return {
    transactions: [],
    importedFiles: [],
    categoryMap: [],
    overrides: [],
    categorySettings: [],
    customCategories: [],
    settings: { quickSpendCategories: [], carChartHidden: false },
    budget: { savingsGoalPct: 20, categories: {} },
    wealthSnapshots: [],
    wealthAccounts: [],
  };
}

describe("serializeBackup / parseBackup round-trip", () => {
  it("re-parses to the same data plus envelope fields", () => {
    const data: BackupData = {
      ...emptyData(),
      categoryMap: [
        { pattern: "wolt", category: "Ravintolat", class: "expense" },
      ],
      wealthAccounts: [{ id: "a1", name: "Käyttötili", kind: "liquid" }],
    };
    const json = serializeBackup(data);
    const parsed = parseBackup(json);
    expect(parsed.app).toBe("finance-dashboard");
    expect(parsed.version).toBe(BACKUP_VERSION);
    expect(parsed.categoryMap).toEqual(data.categoryMap);
    expect(parsed.wealthAccounts).toEqual(data.wealthAccounts);
  });
});

describe("parseBackup validation", () => {
  it("rejects invalid JSON", () => {
    expect(() => parseBackup("not json")).toThrow(/JSON/);
  });

  it("rejects a file from a different app", () => {
    const json = JSON.stringify({ app: "other-app", version: 1 });
    expect(() => parseBackup(json)).toThrow(/tämän sovelluksen/);
  });

  it("rejects a newer, unsupported version", () => {
    const json = serializeBackup(emptyData()).replace(
      `"version": ${BACKUP_VERSION}`,
      `"version": ${BACKUP_VERSION + 1}`,
    );
    expect(() => parseBackup(json)).toThrow(/uudempaa versiota/);
  });

  it("rejects a file missing required fields", () => {
    const json = JSON.stringify({ app: "finance-dashboard", version: 1 });
    expect(() => parseBackup(json)).toThrow(/puuttuu kenttä/);
  });
});
