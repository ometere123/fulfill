export const CHAIN_ID = 61999;
export const CHAIN_NAME = "GenLayer Studionet";
export const RPC_URL = "https://studio.genlayer.com/api";
export const EXPLORER_URL = "https://explorer-studio.genlayer.com";
export const CONTEST_BOND_BPS = 500n;
export const ASSESSMENT_GRACE = 604800;

export const STATUS = [
  "LOCKED",
  "ASSESSMENT_REQUESTED",
  "ASSESSED",
  "CONTESTED",
  "FINALIZED",
  "RECOVERED",
] as const;

export const terminalStatuses = new Set(["FINALIZED", "RECOVERED"]);

export type CheckRule = {
  id: string;
  requirement: string;
  weight_bps: number;
  source_ids: string[];
  min_available: number;
};

export type CheckResult = {
  check_id: string;
  result: "SATISFIED" | "NOT_SATISFIED" | "UNRESOLVED" | "SOURCE_UNAVAILABLE" | "MODEL_OUTPUT_INVALID";
};

export function parseGen(value: string): bigint {
  const text = value.trim();
  if (!/^\d+(\.\d{0,18})?$/.test(text)) throw new Error("Enter a valid GEN amount with up to 18 decimals.");
  const [whole, fractional = ""] = text.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt((fractional + "0".repeat(18)).slice(0, 18));
}

export function formatGen(value: bigint | number | string): string {
  const amount = BigInt(value || 0);
  const whole = amount / 10n ** 18n;
  const fraction = (amount % 10n ** 18n).toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function localContestBond(escrow: bigint | number | string, disputedWeightBps: number): bigint {
  const disputedValue = BigInt(escrow) * BigInt(disputedWeightBps) / 10000n;
  return disputedValue * CONTEST_BOND_BPS / 10000n;
}

export function secondsFromDate(value: string): bigint {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error("Choose a valid date and time.");
  return BigInt(Math.floor(time / 1000));
}

export function toDateInput(seconds: bigint | number | string): string {
  const date = new Date(Number(seconds) * 1000);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "—";
}

export function statusLabel(value: unknown): string {
  const index = Number(value);
  return STATUS[index] ?? "UNKNOWN";
}

export function shortAddress(value = ""): string {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—";
}

export function canRequestAssessment(record: any, wallet: string, now = Math.floor(Date.now() / 1000)): boolean {
  return statusLabel(record?.status) === "LOCKED"
    && wallet.toLowerCase() === String(record?.recipient || "").toLowerCase()
    && now >= Number(record?.assessment_after || 0)
    && now <= Number(record?.request_deadline || 0);
}

export function canAssess(record: any, now = Math.floor(Date.now() / 1000)): boolean {
  return statusLabel(record?.status) === "ASSESSMENT_REQUESTED"
    && now <= Number(record?.requested_at || 0) + ASSESSMENT_GRACE;
}

export function canContest(record: any, wallet: string, now = Math.floor(Date.now() / 1000)): boolean {
  const party = [record?.funder, record?.recipient].map((value) => String(value || "").toLowerCase());
  return statusLabel(record?.status) === "ASSESSED"
    && party.includes(wallet.toLowerCase())
    && now < Number(record?.contest_deadline || 0);
}

export function canFinalize(record: any, now = Math.floor(Date.now() / 1000)): boolean {
  return statusLabel(record?.status) === "ASSESSED" && now >= Number(record?.contest_deadline || 0);
}

export function scoreResults(checks: CheckRule[], results: CheckResult[]) {
  const byId = new Map(checks.map((check) => [check.id, check]));
  let satisfiedBps = 0;
  let unresolved = 0;
  for (const result of results) {
    const check = byId.get(result.check_id);
    if (!check) continue;
    if (result.result === "SATISFIED") satisfiedBps += check.weight_bps;
    else if (result.result !== "NOT_SATISFIED") unresolved += 1;
  }
  return { satisfiedBps, unresolved };
}
