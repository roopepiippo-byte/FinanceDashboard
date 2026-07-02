import { describe, it, expect } from "vitest";
import {
  formatDateFi,
  formatMonthFi,
  parseFinnishDateToIso,
  monthOf,
} from "./format";

describe("formatDateFi", () => {
  it("formats ISO as Finnish dd.mm.yyyy", () => {
    expect(formatDateFi("2024-03-05")).toBe("5.3.2024");
    expect(formatDateFi("2024-12-15")).toBe("15.12.2024");
  });
});

describe("formatMonthFi", () => {
  it("formats YYYY-MM as MM/yyyy", () => {
    expect(formatMonthFi("2024-03")).toBe("03/2024");
  });
});

describe("parseFinnishDateToIso", () => {
  it("parses dd.mm.yyyy and d.m.yyyy", () => {
    expect(parseFinnishDateToIso("15.03.2024")).toBe("2024-03-15");
    expect(parseFinnishDateToIso("5.3.2024")).toBe("2024-03-05");
  });

  it("throws on invalid dates", () => {
    expect(() => parseFinnishDateToIso("2024-03-15")).toThrow();
    expect(() => parseFinnishDateToIso("32.1.2024")).toThrow();
    expect(() => parseFinnishDateToIso("abc")).toThrow();
  });
});

describe("monthOf", () => {
  it("extracts the YYYY-MM month", () => {
    expect(monthOf("2024-03-15")).toBe("2024-03");
  });
});
