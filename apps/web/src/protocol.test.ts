import { describe, expect, it } from "vitest";
import { CHAIN_ID, challengeBond, formatGen, parseGen, statusLabel } from "./protocol";

describe("protocol helpers", () => {
  it("pins the stable Studionet chain", () => expect(CHAIN_ID).toBe(61999));
  it("parses and formats GEN without floating point", () => {
    expect(parseGen("1.25")).toBe(1250000000000000000n);
    expect(formatGen(1250000000000000000n)).toBe("1.25");
  });
  it("computes a 5% challenge bond", () => expect(challengeBond(10000n)).toBe(500n));
  it("maps contract status safely", () => {
    expect(statusLabel(0)).toBe("ACTIVE");
    expect(statusLabel(99)).toBe("UNKNOWN");
  });
  it("rejects malformed GEN amounts", () => expect(() => parseGen("1e9")).toThrow());
});
