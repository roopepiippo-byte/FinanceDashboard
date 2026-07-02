import { describe, it, expect } from "vitest";
import { parseCategoryDbCsv, serializeCategoryDbCsv } from "./categoryDb";

describe("parseCategoryDbCsv", () => {
  it("parses merchant,display,category,group rows", () => {
    const csv = [
      "aasia market tampere,Aasia Market Tampere,Ruoka,Välttämättömät",
      "abc prisma ideapark,ABC Prisma Ideapark,Bensa,Liikkuminen",
    ].join("\n");
    const { entries } = parseCategoryDbCsv(csv);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      pattern: "aasia market tampere",
      display: "Aasia Market Tampere",
      category: "Ruoka",
      class: "expense",
      group: "Välttämättömät",
    });
  });

  it("infers class from the group column (Tulot/Siirrot)", () => {
    const csv = [
      "fellowmind,FELLOWMIND FINLAND,Palkka,Tulot",
      "nordnet,Nordnet,Sijoitus,Siirrot",
      "custom shop,Custom Shop,MyOwnCat,Tulot",
    ].join("\n");
    const { entries, customCategories } = parseCategoryDbCsv(csv);
    expect(entries[0].class).toBe("income");
    expect(entries[1].class).toBe("transfer");
    // Unknown category with group Tulot -> income + custom category created.
    expect(entries[2].class).toBe("income");
    expect(customCategories).toEqual([
      expect.objectContaining({ name: "MyOwnCat", class: "income" }),
    ]);
  });

  it("canonicalizes case variants to built-in categories", () => {
    const { entries, customCategories } = parseCategoryDbCsv(
      "wolt helsinki,Wolt,Mobile pay,Muuttuvat",
    );
    expect(entries[0].category).toBe("Mobile Pay");
    expect(customCategories).toHaveLength(0);
  });

  it("handles display names containing commas (quoted or not)", () => {
    const quoted = 'vipps,"VIPPS MOBILEPAY AS, OSLO",Mobile Pay,Muuttuvat';
    expect(parseCategoryDbCsv(quoted).entries[0]).toMatchObject({
      pattern: "vipps",
      display: "VIPPS MOBILEPAY AS, OSLO",
      category: "Mobile Pay",
    });
    // Unquoted comma in display: category/group read from the end.
    const unquoted = "motonet,Motonet Tampere, Hervanta,Auto,Muuttuvat";
    expect(parseCategoryDbCsv(unquoted).entries[0]).toMatchObject({
      pattern: "motonet",
      category: "Auto",
      group: "Muuttuvat",
    });
  });

  it("skips malformed rows and dedups by pattern (last wins)", () => {
    const csv = ["justkey", "shop,Shop,Ruoka,X", "shop,Shop,Alko,X"].join("\n");
    const { entries, skipped } = parseCategoryDbCsv(csv);
    expect(skipped).toBe(1);
    expect(entries).toHaveLength(1);
    expect(entries[0].category).toBe("Alko");
  });
});

describe("serializeCategoryDbCsv round-trip", () => {
  it("re-parses to the same entries", () => {
    const csv = [
      "aasia market,Aasia Market,Ruoka,Välttämättömät",
      'vipps,"VIPPS MOBILEPAY AS, OSLO",Mobile Pay,Muuttuvat',
    ].join("\n");
    const parsed = parseCategoryDbCsv(csv).entries;
    const out = serializeCategoryDbCsv(parsed);
    const reparsed = parseCategoryDbCsv(out).entries;
    expect(reparsed).toEqual(parsed);
    // Comma-containing field must be quoted in output.
    expect(out).toContain('"VIPPS MOBILEPAY AS, OSLO"');
  });
});
