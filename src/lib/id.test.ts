import { describe, it, expect } from "vitest";
import { transactionId } from "./id";

describe("transactionId", () => {
  it("is deterministic for the same inputs (dedup)", () => {
    const a = transactionId("2024-03-15", -4250, "k-supermarket kamppi", 3);
    const b = transactionId("2024-03-15", -4250, "k-supermarket kamppi", 3);
    expect(a).toBe(b);
  });

  it("differs when any field differs", () => {
    const base = transactionId("2024-03-15", -4250, "k-supermarket", 0);
    expect(transactionId("2024-03-16", -4250, "k-supermarket", 0)).not.toBe(
      base,
    );
    expect(transactionId("2024-03-15", -4251, "k-supermarket", 0)).not.toBe(
      base,
    );
    expect(transactionId("2024-03-15", -4250, "s-market", 0)).not.toBe(base);
    expect(transactionId("2024-03-15", -4250, "k-supermarket", 1)).not.toBe(
      base,
    );
  });
});
