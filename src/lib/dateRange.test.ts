import { describe, it, expect } from "vitest";
import { computeRange, inRange, priorYearRange } from "./dateRange";

const today = new Date(2024, 2, 15); // 2024-03-15 (month is 0-based)

describe("computeRange", () => {
  it("thisMonth spans the whole current month", () => {
    const r = computeRange("thisMonth", today);
    expect(r.from).toBe("2024-03-01");
    expect(r.to).toBe("2024-03-31");
  });

  it("lastMonth handles year boundary", () => {
    const r = computeRange("lastMonth", new Date(2024, 0, 10)); // Jan 2024
    expect(r.from).toBe("2023-12-01");
    expect(r.to).toBe("2023-12-31");
  });

  it("last3 starts three months back on the 1st", () => {
    const r = computeRange("last3", today);
    expect(r.from).toBe("2024-01-01");
    expect(r.to).toBe("2024-03-15");
  });

  it("last12 starts twelve months back", () => {
    const r = computeRange("last12", today);
    expect(r.from).toBe("2023-04-01");
    expect(r.to).toBe("2024-03-15");
  });

  it("thisYear and lastYear cover full calendar years", () => {
    expect(computeRange("thisYear", today).from).toBe("2024-01-01");
    expect(computeRange("thisYear", today).to).toBe("2024-12-31");
    expect(computeRange("lastYear", today).from).toBe("2023-01-01");
    expect(computeRange("lastYear", today).to).toBe("2023-12-31");
  });
});

describe("inRange", () => {
  it("is inclusive of both ends", () => {
    const r = computeRange("thisMonth", today);
    expect(inRange("2024-03-01", r)).toBe(true);
    expect(inRange("2024-03-31", r)).toBe(true);
    expect(inRange("2024-04-01", r)).toBe(false);
  });
});

describe("priorYearRange", () => {
  it("shifts the range back one year", () => {
    const r = computeRange("thisMonth", today);
    const p = priorYearRange(r);
    expect(p.from).toBe("2023-03-01");
    expect(p.to).toBe("2023-03-31");
  });
});
