import { describe, expect, it } from "vitest";
import { CHAIN_ID, formatGen, localContestBond, parseGen, scoreResults, statusLabel, canAssess, canRecoverUnresolved, canFinalizeStalledContest, validateWeights } from "./protocol";

describe("protocol helpers", () => {
  it("pins the stable Studionet chain", () => expect(CHAIN_ID).toBe(61999));

  it("parses and formats GEN without floating point", () => {
    expect(parseGen("1.25")).toBe(1250000000000000000n);
    expect(formatGen(1250000000000000000n)).toBe("1.25");
  });

  it("computes contest bond from disputed value rather than full escrow", () => {
    expect(localContestBond(10000n, 4000)).toBe(200n);
    expect(localContestBond(10000n, 10000)).toBe(500n);
  });

  it("maps scorecard statuses safely", () => {
    expect(statusLabel(0)).toBe("LOCKED");
    expect(statusLabel(4)).toBe("FINALIZED");
    expect(statusLabel(99)).toBe("UNKNOWN");
  });

  it("scores only satisfied weighted checks", () => {
    const checks = [
      { id: "A", requirement: "a", weight_bps: 6000, source_ids: ["SOURCE_A"], min_available: 1 },
      { id: "B", requirement: "b", weight_bps: 4000, source_ids: ["SOURCE_A"], min_available: 1 },
    ];
    expect(scoreResults(checks, [
      { check_id: "A", result: "SATISFIED" },
      { check_id: "B", result: "NOT_SATISFIED" },
    ])).toEqual({ satisfiedBps: 6000, unresolved: 0 });
    expect(scoreResults(checks, [
      { check_id: "A", result: "SATISFIED" },
      { check_id: "B", result: "UNRESOLVED" },
    ])).toEqual({ satisfiedBps: 6000, unresolved: 1 });
  });

  it("gates retries, exhaustion and recovery", () => {
    const record = { status: 1, requested_at: 1000, assessment_attempts: 1, last_assessment_attempt_at: 1000 };
    expect(canAssess(record, 2000)).toBe(false);
    expect(canAssess({...record, assessment_attempts: 8}, 1000000)).toBe(false);
    expect(canRecoverUnresolved({...record, assessment_attempts: 8}, 2000)).toBe(false);
    expect(canRecoverUnresolved({...record, assessment_attempts: 8}, 5000)).toBe(true);
    expect(canFinalizeStalledContest({status: 3, contest_opened_at: 1000, contest_attempts: 8, last_contest_attempt_at: 1000}, 5000)).toBe(true);
  });

  it("requires an exact scorecard total", () => {
    expect(() => validateWeights([{weight_bps: 9999}])).toThrow();
    expect(() => validateWeights([{weight_bps: 6000}, {weight_bps: 4000}])).not.toThrow();
  });

  it("rejects malformed GEN amounts", () => expect(() => parseGen("1e9")).toThrow());
});
