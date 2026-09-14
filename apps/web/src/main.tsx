import "./style.css";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import {
  ArrowRight, CheckCircle2, ChevronRight, CircleDollarSign, ClipboardCheck,
  Copy, FileCheck2, Menu, RefreshCw, Scale, ShieldCheck, Wallet, X
} from "lucide-react";
import {
  CHAIN_ID, CHAIN_NAME, EXPLORER_URL, RPC_URL, canChallenge, canEvaluate, canFinalize,
  canOpenReview, challengeBond, formatGen, parseGen, secondsFromDate, shortAddress,
  statusLabel, terminalStatuses, toDateInput,
} from "./protocol";

const contractAddress = import.meta.env.VITE_FULFILL_CONTRACT_ADDRESS || "";
const readClient: any = createClient({ chain: studionet });
let writeClient: any = null;

type Commitment = Record<string, any> & { id: number };

const NAV = [
  ["/commitments", "Commitments"],
  ["/issue", "Create"],
  ["/my-rights", "My rights"],
  ["/my-issued", "My issued"],
  ["/about", "How it works"],
];

function useRoute() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const onPop = () => setPath(location.pathname);
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  const navigate = (next: string) => {
    history.pushState({}, "", next);
    setPath(next);
    scrollTo({ top: 0, behavior: "smooth" });
  };
  return { path, navigate };
}

function useWallet() {
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState("");
  const connect = async () => {
    setError("");
    if (!window.ethereum) return setError("Connect an injected wallet to continue.");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const current = Number(await window.ethereum.request({ method: "eth_chainId" }));
      if (current !== CHAIN_ID) {
        try {
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }] });
        } catch (switchError: any) {
          if (switchError?.code !== 4902) throw switchError;
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}`, chainName: CHAIN_NAME, nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 }, rpcUrls: [RPC_URL], blockExplorerUrls: [EXPLORER_URL] }],
          });
        }
      }
      const account = accounts[0];
      writeClient = createClient({ chain: studionet, provider: window.ethereum, account });
      await writeClient.connect("studionet");
      setWallet(account);
    } catch (reason: any) {
      setError(reason?.message || "Wallet connection failed.");
    }
  };
  const disconnect = () => { setWallet(""); writeClient = null; };
  return { wallet, connect, disconnect, error };
}

async function read(functionName: string, args: any[] = []) {
  if (!contractAddress) throw new Error("VITE_FULFILL_CONTRACT_ADDRESS is not configured.");
  return readClient.readContract({ address: contractAddress, functionName, args });
}

async function write(functionName: string, args: any[] = [], value = 0n) {
  if (!writeClient) throw new Error("Connect your wallet first.");
  if (!contractAddress) throw new Error("VITE_FULFILL_CONTRACT_ADDRESS is not configured.");
  const hash = await writeClient.writeContract({ address: contractAddress, functionName, args, value });
  const receipt = await writeClient.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, fullTransaction: true });
  const consensus = String(receipt.resultName || "");
  if (["MAJORITY_DISAGREE", "NO_MAJORITY", "DISAGREE"].includes(consensus)) throw new Error("Validator consensus was not reached. No successful state change is being reported.");
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) throw new Error("The transaction did not finish successfully.");
  return receipt;
}

async function loadCommitments(): Promise<Commitment[]> {
  const count = Number(await read("get_commitment_counter"));
  if (!count) return [];
  const items: Commitment[] = [];
  for (let start = 1; start <= count; start += 25) {
    const page: any[] = await read("list_commitments", [start, Math.min(25, count - start + 1)]);
    page.forEach((item, offset) => items.push({ id: start + offset, ...item }));
  }
  return items;
}

function LogoMark() { return <span className="logo-mark" aria-hidden="true"><span>✓</span></span>; }

function Shell({ children, walletState, navigate }: any) {
  const [open, setOpen] = useState(false);
  const [walletMenu, setWalletMenu] = useState(false);
  const { wallet, connect, disconnect, error } = walletState;
  return <div className="app-shell">
    <div className="grain" />
    <header className="topbar">
      <button className="brand" onClick={() => navigate("/")}><LogoMark /><b>FULFILL</b></button>
      <button className="menu-button" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      <nav className={open ? "nav-open" : ""}>{NAV.map(([path, label]) => <button key={path} onClick={() => { navigate(path); setOpen(false); }}>{label}</button>)}</nav>
      <div className="wallet-wrap">
        {!wallet ? <button className="button compact" onClick={connect}><Wallet size={16}/> Connect</button> : <>
          <button className="wallet-pill" onClick={() => setWalletMenu(!walletMenu)}><i />{shortAddress(wallet)}</button>
          {walletMenu && <div className="wallet-menu"><span>Connected on 61999</span><button onClick={() => navigator.clipboard?.writeText(wallet)}><Copy size={14}/> Copy address</button><button onClick={() => { disconnect(); setWalletMenu(false); }}>Disconnect</button></div>}
        </>}
      </div>
    </header>
    {error && <div className="toast error">{error}</div>}
    <main>{children}</main>
    <footer><div><LogoMark /><b>FULFILL</b><span>Performance commitments, enforced by evidence.</span></div><div className="footer-meta"><span>GenLayer Studionet · 61999</span><span>AI classifies · deterministic code settles</span></div></footer>
  </div>;
}

function Metric({ label, value, note }: {label: string; value: string; note: string}) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function StatusBadge({ record }: {record: any}) { const status = statusLabel(record.status); return <span className={`status ${terminalStatuses.has(status) ? "terminal" : ""}`}>{status.replaceAll("_", " ")}</span>; }

function Home({ navigate }: any) {
  return <>
    <section className="hero"><div className="hero-copy"><span className="kicker">ESCROW + PUBLIC EVIDENCE + VALIDATOR CONSENSUS</span><h1>Promises are easy.<br/><em>Fulfilment should be provable.</em></h1><p>Lock a performance commitment before the outcome is known. If it is disputed, GenLayer reviews the evidence you froze at creation and deterministic rules settle the escrow.</p><div className="hero-actions"><button className="button" onClick={() => navigate("/issue")}>Create commitment <ArrowRight size={17}/></button><button className="button secondary" onClick={() => navigate("/commitments")}>Explore commitments</button></div></div>
      <div className="proof-card tilt"><div className="proof-head"><span>COMMITMENT FLOW</span><span className="live-dot">61999</span></div><div className="proof-step"><b>01</b><span>Terms + sources frozen</span><CheckCircle2/></div><div className="proof-step"><b>02</b><span>Escrow funded exactly</span><CircleDollarSign/></div><div className="proof-step"><b>03</b><span>Validators classify evidence</span><Scale/></div><div className="proof-step"><b>04</b><span>Code settles the result</span><ShieldCheck/></div><div className="stamp">NO ADMIN JUDGE</div></div>
    </section>
    <section className="principle-strip"><strong>THE RULE</strong><span>Validators choose only a frozen outcome code.</span><span>The contract decides the money.</span></section>
    <section className="section"><div className="section-title"><span>Why this fits GenLayer</span><h2>The hard part is not escrow.<br/>It is deciding what happened.</h2></div><div className="feature-grid"><article><FileCheck2/><h3>Frozen evidence authority</h3><p>Every source and its authority role is fixed before performance is evaluated. Claimants cannot swap in a friendlier source later.</p></article><article><Scale/><h3>Semantic classification</h3><p>Validators interpret real-world evidence against a written obligation where ordinary deterministic contracts cannot.</p></article><article><ShieldCheck/><h3>Deterministic settlement</h3><p>AI never invents compensation. Each allowed outcome already has a payout percentage committed on-chain.</p></article></div></section>
  </>;
}

function CommitmentCard({ record, navigate }: {record: Commitment; navigate: (p:string)=>void}) {
  return <button className="commitment-card" onClick={() => navigate(`/commitment/${record.id}`)}><div className="row"><span className="mono">#{String(record.id).padStart(3,"0")}</span><StatusBadge record={record}/></div><h3>{record.title}</h3><p>{record.obligation}</p><div className="card-grid"><span><small>ESCROW</small><b>{formatGen(record.escrow_total)} GEN</b></span><span><small>BENEFICIARY</small><b>{shortAddress(record.beneficiary)}</b></span></div><div className="card-link">Inspect commitment <ChevronRight size={16}/></div></button>;
}

function CommitmentList({ navigate, filter }: {navigate:any; filter?: (r:Commitment)=>boolean}) {
  const [items, setItems] = useState<Commitment[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = async () => { setLoading(true); setError(""); try { setItems(await loadCommitments()); } catch (e:any) { setError(e.message); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []); const shown = filter ? items.filter(filter) : items;
  return <section className="page"><div className="page-head"><div><span className="kicker">ON-CHAIN REGISTRY</span><h1>Commitments</h1><p>Public, bounded records with frozen terms and deterministic payout rules.</p></div><button className="button secondary compact" onClick={load}><RefreshCw size={15}/> Refresh</button></div>{loading ? <div className="empty">Loading commitment registry…</div> : error ? <div className="empty error-panel">{error}</div> : shown.length ? <div className="commitment-grid">{shown.map((r) => <CommitmentCard key={r.id} record={r} navigate={navigate}/>)}</div> : <div className="empty"><ClipboardCheck size={28}/><h3>No commitments found</h3><p>Create the first funded commitment or connect the wallet that owns your records.</p></div>}</section>;
}

function Issue({ wallet, navigate }: any) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setMessage(""); if (!wallet) return setMessage("Connect the promisor wallet before creating a commitment."); const data = new FormData(event.currentTarget); try { setBusy(true); const escrow = parseGen(String(data.get("escrow"))); const sourceUrl = String(data.get("sourceUrl")); const partial = Number(data.get("partialBps") || 5000); if (partial <= 0 || partial >= 10000) throw new Error("Partial breach payout must be between 1 and 9,999 bps."); const sources = JSON.stringify([{ label: "Primary evidence", url: sourceUrl, authority: "PRIMARY", required: true }]); const outcomes = JSON.stringify([{ code: "FULFILLED", description: "The frozen obligation was fulfilled.", payout_bps: 0 }, { code: "PARTIAL_BREACH", description: "The obligation was materially but not completely breached.", payout_bps: partial }, { code: "BREACHED", description: "The frozen obligation was breached at the maximum-liability level.", payout_bps: 10000 }]); await write("create_commitment", [String(data.get("beneficiary")), String(data.get("title")), String(data.get("obligation")), secondsFromDate(String(data.get("start"))), secondsFromDate(String(data.get("end"))), secondsFromDate(String(data.get("reviewAfter"))), secondsFromDate(String(data.get("deadline"))), escrow, sources, outcomes], escrow); navigate("/commitments"); } catch (e:any) { setMessage(e.message || "Creation failed."); } finally { setBusy(false); } };
  return <section className="page narrow"><div className="page-head"><div><span className="kicker">CREATE A FUNDED COMMITMENT</span><h1>Put the promise on the line.</h1><p>These terms become the frozen settlement policy. Review them before signing.</p></div></div><form className="form-card" onSubmit={submit}><div className="form-section"><span>01 · Parties & value</span><label>Beneficiary address<input name="beneficiary" required placeholder="0x…"/></label><div className="two"><label>Escrow (GEN)<input name="escrow" required inputMode="decimal" placeholder="25"/></label><label>Partial breach payout (bps)<input name="partialBps" required type="number" min="1" max="9999" defaultValue="5000"/></label></div></div><div className="form-section"><span>02 · Obligation</span><label>Commitment title<input name="title" required maxLength={140} placeholder="99.9% service availability"/></label><label>Measurable obligation<textarea name="obligation" required maxLength={2400} placeholder="State exactly what counts as fulfilled, partial breach, and breach."/></label></div><div className="form-section"><span>03 · Timeline</span><div className="two"><label>Performance starts<input name="start" required type="datetime-local"/></label><label>Performance ends<input name="end" required type="datetime-local"/></label><label>Review available after<input name="reviewAfter" required type="datetime-local"/></label><label>Claim deadline<input name="deadline" required type="datetime-local"/></label></div></div><div className="form-section"><span>04 · Evidence authority</span><label>Required primary HTTPS source<input name="sourceUrl" required type="url" pattern="https://.*" placeholder="https://status.example.com/history"/></label><p className="hint">The source is authority, not instructions. Linked pages do not become new evidence sources automatically.</p></div><div className="policy-box"><b>Settlement policy</b><span>FULFILLED → 0%</span><span>PARTIAL_BREACH → chosen bps</span><span>BREACHED → 100%</span></div>{message && <div className="inline-error">{message}</div>}<button className="button wide" disabled={busy}>{busy ? "Submitting…" : "Fund & create commitment"}<ArrowRight size={17}/></button></form></section>;
}

function Action({ enabled, label, help, onClick }: any) { return <div className={`action-row ${enabled ? "enabled" : ""}`}><div><b>{label}</b><small>{help}</small></div><button disabled={!enabled} onClick={onClick}><ArrowRight size={15}/></button></div>; }

function Detail({ id, wallet }: {id:number; wallet:string}) {
  const [record, setRecord] = useState<Commitment | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState("");
  const load = async () => { try { setRecord({ id, ...(await read("get_commitment", [id])) }); setError(""); } catch (e:any) { setError(e.message); } };
  useEffect(() => { load(); }, [id]);
  const action = async (label:string, fn:string, value=0n) => { try { setBusy(label); setError(""); await write(fn, [id], value); await load(); } catch (e:any) { setError(e.message); } finally { setBusy(""); } };
  if (error && !record) return <section className="page"><div className="empty error-panel">{error}</div></section>; if (!record) return <section className="page"><div className="empty">Loading commitment…</div></section>;
  const sourceRules = JSON.parse(record.sources || "[]"); const outcomeRules = JSON.parse(record.outcomes || "[]"); const bond = challengeBond(record.escrow_total);
  return <section className="page"><div className="detail-head"><div><span className="kicker">COMMITMENT #{String(id).padStart(3,"0")}</span><h1>{record.title}</h1></div><StatusBadge record={record}/></div><div className="metric-row"><Metric label="ESCROW" value={`${formatGen(record.escrow_total)} GEN`} note={`${formatGen(record.escrow_remaining)} GEN still locked`}/><Metric label="BENEFICIARY PAID" value={`${formatGen(record.beneficiary_paid)} GEN`} note="Deterministic settlement"/><Metric label="PROMISOR RETURNED" value={`${formatGen(record.promisor_returned)} GEN`} note="Unused liability"/></div><div className="detail-grid"><div className="stack"><article className="panel"><span className="panel-label">Frozen obligation</span><p className="obligation">{record.obligation}</p><div className="party-grid"><span><small>PROMISOR</small><b>{record.promisor}</b></span><span><small>BENEFICIARY</small><b>{record.beneficiary}</b></span></div></article><article className="panel"><span className="panel-label">Frozen evidence</span>{sourceRules.map((s:any, i:number)=><div className="rule-row" key={i}><div><b>{s.label}</b><small>{s.authority} · {s.required ? "REQUIRED" : "OPTIONAL"}</small></div><a href={s.url} target="_blank" rel="noreferrer">Open source</a></div>)}</article><article className="panel"><span className="panel-label">Outcome matrix</span>{outcomeRules.map((o:any)=><div className="rule-row" key={o.code}><div><b>{o.code}</b><small>{o.description}</small></div><strong>{(Number(o.payout_bps)/100).toFixed(2)}%</strong></div>)}</article></div><aside className="panel action-panel"><span className="panel-label">Available actions</span><Action enabled={canOpenReview(record,wallet)} label="Open review" help="Beneficiary opens the evidence review after performance ends." onClick={()=>action("open","open_review")}/><Action enabled={canEvaluate(record)} label="Run validator review" help="Permissionless. Validators inspect only the frozen sources." onClick={()=>action("evaluate","evaluate_commitment")}/><Action enabled={canChallenge(record,wallet)} label={`Challenge · ${formatGen(bond)} GEN bond`} help="A 5% bond discourages directionless challenges." onClick={()=>action("challenge","challenge_result",bond)}/><Action enabled={statusLabel(record.status)==="CHALLENGED"} label="Resolve challenge" help="Permissionless review under the same frozen policy." onClick={()=>action("resolve","resolve_challenge")}/><Action enabled={canFinalize(record)} label="Finalize result" help="Settles once the challenge window closes." onClick={()=>action("finalize","finalize_result")}/><Action enabled={statusLabel(record.status)==="ACTIVE" && Date.now()/1000>Number(record.claim_deadline)} label="Reclaim expired" help="Returns escrow when no review was opened in time." onClick={()=>action("reclaim","reclaim_expired")}/><Action enabled={["REVIEW_OPEN","RETRYABLE"].includes(statusLabel(record.status)) && Date.now()/1000>Number(record.opened_at)+604800} label="Close unresolved" help="Liveness escape after the bounded review window." onClick={()=>action("unresolved","finalize_unresolved")}/><Action enabled={statusLabel(record.status)==="CHALLENGED" && Date.now()/1000>Number(record.challenge_opened_at)+604800} label="Close stalled challenge" help="Falls back to the provisional code and returns the bond." onClick={()=>action("stalled","finalize_stalled_challenge")}/>{busy && <div className="action-note">Transaction pending: {busy}</div>}{error && <div className="inline-error">{error}</div>}</aside></div><article className="panel timeline"><span className="panel-label">Timeline</span><div><span>Performance</span><b>{toDateInput(record.performance_start)} → {toDateInput(record.performance_end)}</b></div><div><span>Review after</span><b>{toDateInput(record.review_after)}</b></div><div><span>Claim deadline</span><b>{toDateInput(record.claim_deadline)}</b></div><div><span>Primary attempts</span><b>{String(record.review_attempts)} / 8</b></div><div><span>Challenge attempts</span><b>{String(record.challenge_attempts)} / 8</b></div></article></section>;
}

function WalletList({ navigate, wallet, mode }: any) { if (!wallet) return <section className="page"><div className="empty"><Wallet size={30}/><h3>Connect your wallet</h3><p>This view filters public commitments by your connected address.</p></div></section>; const key = mode === "rights" ? "beneficiary" : "promisor"; return <CommitmentList navigate={navigate} filter={(r)=>String(r[key]).toLowerCase()===wallet.toLowerCase()}/>; }
function About() { return <section className="page narrow"><div className="page-head"><div><span className="kicker">DESIGN PRINCIPLES</span><h1>Judgement stays narrow.</h1><p>Fulfill separates semantic classification from money movement so the non-deterministic part cannot expand its own authority.</p></div></div><div className="about-stack"><article className="panel"><b>1 · Commit before the facts are known.</b><p>Parties freeze the obligation, beneficiary, evidence authority, timing, and payout matrix while the outcome is still uncertain.</p></article><article className="panel"><b>2 · Validators classify; they do not negotiate.</b><p>GenLayer handles the part a normal contract cannot: interpreting external public evidence against natural-language performance terms.</p></article><article className="panel"><b>3 · Failure is a state, not a hidden denial.</b><p>Unavailable sources, invalid model output, inconclusive evidence, retries, challenges, and bounded recovery paths are explicit.</p></article><article className="panel"><b>4 · Settlement remains deterministic.</b><p>The only financial output is escrow × the basis points already attached to the selected frozen outcome code.</p></article></div></section>; }

function App() {
  const route = useRoute(); const walletState = useWallet(); const detail = route.path.match(/^\/commitment\/(\d+)$/);
  const content = useMemo(() => { if (detail) return <Detail id={Number(detail[1])} wallet={walletState.wallet}/>; if (route.path === "/commitments") return <CommitmentList navigate={route.navigate}/>; if (route.path === "/issue") return <Issue wallet={walletState.wallet} navigate={route.navigate}/>; if (route.path === "/my-rights") return <WalletList navigate={route.navigate} wallet={walletState.wallet} mode="rights"/>; if (route.path === "/my-issued") return <WalletList navigate={route.navigate} wallet={walletState.wallet} mode="issued"/>; if (route.path === "/about") return <About/>; return <Home navigate={route.navigate}/>; }, [route.path, walletState.wallet]);
  return <Shell walletState={walletState} navigate={route.navigate}>{content}</Shell>;
}

createRoot(document.getElementById("root")!).render(<App/>);
