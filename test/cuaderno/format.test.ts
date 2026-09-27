import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDecimal,
  formatTime,
  parseTime,
  slugifyMonster,
} from "../../src/app/cuaderno/format.js";

describe("parseTime", () => {
  it.each([
    ["18:40", 1120],
    ["0:05", 5],
    ["120:00", 7200],
    [" 9:59 ", 599],
  ])("parses %j", (input, seconds) => {
    expect(parseTime(input)).toBe(seconds);
  });

  it.each(["", "18:4", "1:60", "18", "a:bc", "1234:00", "-1:00"])(
    "rejects %j",
    (input) => {
      expect(parseTime(input)).toBeNull();
    },
  );
});

describe("formatTime", () => {
  it("formats seconds as m:ss", () => {
    expect(formatTime(1120)).toBe("18:40");
    expect(formatTime(5)).toBe("0:05");
  });
  it("shows a dash when there is no time", () => {
    expect(formatTime(null)).toBe("—");
  });
  it("round-trips with parseTime", () => {
    expect(parseTime(formatTime(955))).toBe(955);
  });
});

describe("formatDate / formatDecimal", () => {
  it("formats ISO dates day-first", () => {
    expect(formatDate("2026-09-05")).toBe("5/9/2026");
  });
  it("uses a decimal comma", () => {
    expect(formatDecimal(1.5)).toBe("1,5");
    expect(formatDecimal(1)).toBe("1,0");
  });
});

describe("slugifyMonster", () => {
  it.each([
    ["Rey Dau", "rey-dau"],
    ["Rathalos", "rathalos"],
    ["  Gore Magala ", "gore-magala"],
    ["Nu Udra (Arquetemplado)", "nu-udra-arquetemplado"],
    ["Jyuratodus Ácido", "jyuratodus-acido"],
  ])("%j → %j", (name, slug) => {
    expect(slugifyMonster(name)).toBe(slug);
  });
});
