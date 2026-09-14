export const CHAIN_ID = 61999;
export const CHAIN_NAME = "GenLayer Studionet";
export const RPC_URL = "https://studio.genlayer.com/api";
export const EXPLORER_URL = "https://explorer-studio.genlayer.com";
export const CHALLENGE_BOND_BPS = 500n;

export const STATUS = [
  "ACTIVE",
  "REVIEW_OPEN",
  "RETRYABLE",
  "PROVISIONAL",
  "CHALLENGED",
  "SETTLED_PAID",
  "SETTLED_RETURNED",
  "EXPIRED_RETURNED",
  "INCONCLUSIVE_RETURNED",
] as const;

export const terminalStatuses = new Set([
  "SETTLED_PAID",
  "SETTLED_RETURNED",
  "EXPIRED_RETURNED",
  "INCONCLUSIVE_RETURNED",
]);

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

export function challengeBond(escrow: bigint | number | string): bigint {
  return BigInt(escrow) * CHALLENGE_BOND_BPS / 10000n;
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

export function canOpenReview(record: any, wallet: string, now = Math.floor(Date.now() / 1000)): boolean {
  return statusLabel(record?.status) === "ACTIVE"
    && wallet.toLowerCase() === String(record?.beneficiary || "").toLowerCase()
    && now >= Number(record?.review_after || 0)
    && now <= Number(record?.claim_deadline || 0);
}

export function canEvaluate(record: any, now = Math.floor(Date.now() / 1000)): boolean {
  const status = statusLabel(record?.status);
  return (status === "REVIEW_OPEN" || status === "RETRYABLE")
    && now <= Number(record?.opened_at || 0) + 604800;
}

export function canChallenge(record: any, wallet: string, now = Math.floor(Date.now() / 1000)): boolean {
  const party = [record?.promisor, record?.beneficiary].map((v) => String(v || "").toLowerCase());
  return statusLabel(record?.status) === "PROVISIONAL"
    && party.includes(wallet.toLowerCase())
    && now < Number(record?.challenge_deadline || 0);
}

export function canFinalize(record: any, now = Math.floor(Date.now() / 1000)): boolean {
  return statusLabel(record?.status) === "PROVISIONAL" && now >= Number(record?.challenge_deadline || 0);
}
