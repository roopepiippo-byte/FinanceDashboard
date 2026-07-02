import { describe, it, expect } from "vitest";
import { mapNordeaCsv } from "./mapNordea";
import { parseNordeaCsv } from "./parse";

const HEADER = "Kirjauspäivä;Määrä;Saaja/Maksaja;Saldo";

const CSV = [
  HEADER,
  "15.03.2024;-42,50;K-Supermarket Kamppi;1 234,56",
  "16.03.2024;2 500,00;Nordea Palkka;3 734,56",
  "17.03.2024;-1 000,00;Vuokra Oy;2 734,56",
].join("\n");

describe("parseNordeaCsv", () => {
  it("detects Nordea format and strips BOM", () => {
    const withBom = "﻿" + CSV;
    const { headers, rows } = parseNordeaCsv(withBom);
    expect(headers).toContain("Kirjauspäivä");
    expect(rows).toHaveLength(3);
  });

  it("rejects non-Nordea files", () => {
    expect(() => parseNordeaCsv("foo,bar\n1,2")).toThrow();
  });
});

describe("mapNordeaCsv", () => {
  it("maps rows to transactions with integer cents and ISO dates", () => {
    const { transactions, errors } = mapNordeaCsv(CSV, "file1");
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(3);

    const [food, salary] = transactions;
    expect(food.date).toBe("2024-03-15");
    expect(food.amountCents).toBe(-4250);
    expect(food.merchant).toBe("K-Supermarket Kamppi");
    expect(food.merchantLower).toBe("k-supermarket kamppi");
    expect(food.balanceCents).toBe(123456);
    expect(food.isIncome).toBe(false);
    expect(food.sourceFileId).toBe("file1");

    expect(salary.amountCents).toBe(250000);
    expect(salary.isIncome).toBe(true);
  });

  it("produces identical ids on re-parse (dedup, FR-006)", () => {
    const a = mapNordeaCsv(CSV, "file1").transactions.map((t) => t.id);
    const b = mapNordeaCsv(CSV, "file1").transactions.map((t) => t.id);
    expect(a).toEqual(b);
  });

  it("collects per-row errors without failing the whole import", () => {
    const bad = [HEADER, "not-a-date;-1,00;Shop;0,00"].join("\n");
    const { transactions, errors } = mapNordeaCsv(bad, "f");
    expect(transactions).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(1);
  });
});

describe("mapNordeaCsv — real Nordea export format", () => {
  const REAL = [
    "Kirjauspäivä;Määrä;Maksaja;Maksunsaaja;Nimi;Otsikko;Viesti;Viitenumero;Saldo;Valuutta;",
    "2026/04/30;-16,62;FI97 1146 3501 1073 50;;TAMPERE LIELAHT;TAMPERE LIELAHT;TAMPERE;260423812024;4389,29;EUR;",
    "2026/04/30;3106,99;;FI97 1146 3501 1073 50;FELLOWMIND FINLAND OY AB;FELLOWMIND FINLAND OY AB;Palkka kaudelta 4/2026;;4427,34;EUR;",
  ].join("\n");

  it("parses yyyy/mm/dd dates and prefers the Nimi merchant column", () => {
    const { transactions, errors } = mapNordeaCsv(REAL, "acct");
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(2);

    const [expense, income] = transactions;
    expect(expense.date).toBe("2026-04-30");
    expect(expense.amountCents).toBe(-1662);
    expect(expense.merchant).toBe("TAMPERE LIELAHT");
    expect(expense.balanceCents).toBe(438929);
    expect(expense.isIncome).toBe(false);

    expect(income.amountCents).toBe(310699);
    expect(income.merchant).toBe("FELLOWMIND FINLAND OY AB");
    expect(income.isIncome).toBe(true);
  });
});
