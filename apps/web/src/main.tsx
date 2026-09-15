import "./style.css";
import "./layout-fixes.css";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import {
  ArrowRight, CheckCircle2, ChevronRight, ClipboardCheck,
  Copy, FileCheck2, Menu, RefreshCw, Scale, ShieldCheck, Wallet, X
} from "lucide-react";
import {
  CHAIN_ID, CHAIN_NAME, EXPLORER_URL, RPC_URL,
  canAssess, canContest, canFinalize, requestAssessmentState, canRecoverUnresolved, canResolveContest, canFinalizeStalledContest, formatGen,
  CLOCK_SKEW_MARGIN, MAX_ASSESSMENT_ATTEMPTS, MAX_CONTEST_ATTEMPTS,
  localContestBond, parseGen, secondsFromDate, shortAddress, statusLabel, validateTimeline,
  terminalStatuses, toDateInput, type CheckResult, type CheckRule,
  transactionExecutionOutcome,
} from "./protocol";

const contractAddress = import.meta.env.VITE_FULFILL_CONTRACT_ADDRESS || "";
const readClient: any = createClient({ chain: studionet });
let writeClient: any = null;

type Commitment = Record<string, any> & { id: number };
type SourceRule = { id: string; label: string; url: string };

const NAV = [
  ["/commitments", "Commitments"],
  ["/issue", "Create"],
  ["/my-recipient", "My recipient side"],
  ["/my-funded", "My funded"],
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

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;

    const syncAccount = (accounts: string[]) => {
      const account = accounts[0] || "";
      writeClient = account
        ? createClient({ chain: studionet, provider, account: account as `0x${string}` })
        : null;
      setWallet(account);
    };
    const syncChain = (chainId: string) => {
      setError(Number(chainId) === CHAIN_ID ? "" : `Switch your wallet to ${CHAIN_NAME} (chain ${CHAIN_ID}).`);
    };

    provider.request({ method: "eth_accounts" }).then(syncAccount).catch(() => undefined);
    provider.request({ method: "eth_chainId" }).then(syncChain).catch(() => undefined);
    provider.on?.("accountsChanged", syncAccount);
    provider.on?.("chainChanged", syncChain);
    return () => {
      provider.removeListener?.("accountsChanged", syncAccount);
      provider.removeListener?.("chainChanged", syncChain);
    };
  }, []);

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
            params: [{
              chainId: `0x${CHAIN_ID.toString(16)}`,
              chainName: CHAIN_NAME,
              nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
              rpcUrls: [RPC_URL],
              blockExplorerUrls: [EXPLORER_URL],
            }],
          });
        }
      }
      const account = accounts[0];
      writeClient = createClient({ chain: studionet, provider: window.ethereum, account });
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
  let receipt;
  try {
    receipt = await writeClient.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      interval: 5000,
      retries: 360,
      fullTransaction: true,
    });
  } catch (reason: any) {
    const message = String(reason?.message || reason);
    if (/tim(e|ed out)|timeout|retries/i.test(message)) {
      throw new Error(`Transaction was submitted but is still waiting for finalization. Check its live status in Explorer: ${EXPLORER_URL}/tx/${hash}`);
    }
    throw reason;
  }
  const consensus = String(receipt.resultName || "");
  if (["MAJORITY_DISAGREE", "NO_MAJORITY", "DISAGREE"].includes(consensus)) {
    throw new Error("Validator consensus was not reached. No successful state change is being reported.");
  }
  const outcome = transactionExecutionOutcome(receipt);
  if (outcome === "ERROR") throw new Error(`Contract execution failed. Check the transaction in Explorer: ${EXPLORER_URL}/tx/${hash}`);
  if (outcome === "UNKNOWN") throw new Error(`Transaction finalized, but the execution result could not be interpreted. Do not resubmit yet. Check its state in Explorer: ${EXPLORER_URL}/tx/${hash}`);
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

function LogoMark() {
  return <span className="logo-mark" aria-hidden="true"><span>✓</span></span>;
}

function Shell({ children, walletState, navigate }: any) {
  const [open, setOpen] = useState(false);
  const [walletMenu, setWalletMenu] = useState(false);
  const { wallet, connect, disconnect, error } = walletState;
  return <div className="app-shell">
    <div className="grain" />
    <header className="topbar">
      <button className="brand" onClick={() => navigate("/")}><LogoMark /><b>FULFILL</b></button>
      <button className="menu-button" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      <nav className={open ? "nav-open" : ""}>
        {NAV.map(([path, label]) => <button key={path} onClick={() => { navigate(path); setOpen(false); }}>{label}</button>)}
      </nav>
      <div className="wallet-wrap">
        {!wallet
          ? <button className="button compact" onClick={connect}><Wallet size={16}/> Connect</button>
          : <>
              <button className="wallet-pill" onClick={() => setWalletMenu(!walletMenu)}><i />{shortAddress(wallet)}</button>
              {walletMenu && <div className="wallet-menu">
                <span>Connected on Studionet 61999</span>
                <button onClick={() => navigator.clipboard?.writeText(wallet)}><Copy size={14}/> Copy address</button>
                <button onClick={() => { disconnect(); setWalletMenu(false); }}>Disconnect</button>
              </div>}
            </>
        }
      </div>
    </header>
    {error && <div className="toast error">{error}</div>}
    <main>{children}</main>
    <footer>
      <div><LogoMark /><b>FULFILL</b><span>Performance escrow measured check by check.</span></div>
      <div className="footer-meta"><span>GenLayer Studionet · 61999</span><span>validators assess · code scores · escrow settles</span></div>
    </footer>
  </div>;
}

function Metric({ label, value, note }: {label: string; value: string; note: string}) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function StatusBadge({ record }: {record: any}) {
  const status = statusLabel(record.status);
  return <span className={`status ${terminalStatuses.has(status) ? "terminal" : ""}`}>{status.replaceAll("_", " ")}</span>;
}

function Home({ navigate }: any) {
  return <>
    <section className="hero">
      <div className="hero-copy">
        <span className="kicker">WEIGHTED PERFORMANCE ESCROW</span>
        <h1>Don’t argue about one verdict.<br/><em>Measure the promise.</em></h1>
        <p>Fulfill breaks a real-world commitment into weighted checks. GenLayer assesses each check against its frozen evidence scope, while deterministic code turns the satisfied weight into the recipient’s payout.</p>
        <div className="hero-actions">
          <button className="button" onClick={() => navigate("/issue")}>Create scorecard <ArrowRight size={17}/></button>
          <button className="button secondary" onClick={() => navigate("/commitments")}>Explore commitments</button>
        </div>
      </div>
      <div className="proof-card tilt">
        <div className="proof-head"><span>FULFILMENT SCORECARD</span><span className="live-dot">61999</span></div>
        <div className="proof-step"><b>40%</b><span>Delivered by deadline</span><CheckCircle2/></div>
        <div className="proof-step"><b>35%</b><span>Required quantity reached</span><Scale/></div>
        <div className="proof-step"><b>25%</b><span>Quality threshold passed</span><ShieldCheck/></div>
        <div className="stamp">CHECKS, NOT ONE VERDICT</div>
      </div>
    </section>
    <section className="principle-strip">
      <strong>THE RULE</strong>
      <span>Every check has its own weight and evidence scope.</span>
      <span>Recipient payout = escrow × satisfied weight.</span>
    </section>
    <section className="section">
      <div className="section-title"><span>Why this fits GenLayer</span><h2>Semantics stay narrow.<br/>Settlement stays exact.</h2></div>
      <div className="feature-grid">
        <article><FileCheck2/><h3>Scoped evidence</h3><p>Each check names the exact source IDs validators may use. A source proving delivery does not automatically become authority for quality.</p></article>
        <article><Scale/><h3>Independent checks</h3><p>GenLayer decides SATISFIED, NOT SATISFIED, or UNRESOLVED per requirement instead of compressing a complex performance record into one label.</p></article>
        <article><ShieldCheck/><h3>Deterministic score</h3><p>The model never chooses money. Satisfied check weights sum to basis points, and the contract performs the payout calculation.</p></article>
      </div>
    </section>
  </>;
}

function CommitmentCard({ record, navigate }: {record: Commitment; navigate: (path:string)=>void}) {
  const checkCount = JSON.parse(record.checks || "[]").length;
  return <button className="commitment-card" onClick={() => navigate(`/commitment/${record.id}`)}>
    <div className="row"><span className="mono">#{String(record.id).padStart(3,"0")}</span><StatusBadge record={record}/></div>
    <h3>{record.title}</h3>
    <p>{record.obligation}</p>
    <div className="card-grid">
      <span><small>ESCROW</small><b>{formatGen(record.escrow_total)} GEN</b></span>
      <span><small>SCORECARD</small><b>{checkCount} weighted checks</b></span>
    </div>
    <div className="card-link">Inspect scorecard <ChevronRight size={16}/></div>
  </button>;
}

function CommitmentList({ navigate, filter }: {navigate:any; filter?: (record:Commitment)=>boolean}) {
  const [items, setItems] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try { setItems(await loadCommitments()); }
    catch (reason:any) { setError(reason.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const shown = filter ? items.filter(filter) : items;
  return <section className="page">
    <div className="page-head">
      <div><span className="kicker">ON-CHAIN PERFORMANCE REGISTRY</span><h1>Commitments</h1><p>Funded promises with frozen weighted checks, scoped evidence and deterministic scoring.</p></div>
      <button className="button secondary compact" onClick={load}><RefreshCw size={15}/> Refresh</button>
    </div>
    {loading
      ? <div className="empty">Loading commitment registry…</div>
      : error
        ? <div className="empty error-panel">{error}</div>
        : shown.length
          ? <div className="commitment-grid">{shown.map((record) => <CommitmentCard key={record.id} record={record} navigate={navigate}/>)}</div>
          : <div className="empty"><ClipboardCheck size={28}/><h3>No commitments found</h3><p>Create a funded scorecard or connect the wallet that owns your records.</p></div>
    }
  </section>;
}

function scopeFrom(value: FormDataEntryValue | null, hasB: boolean): string[] {
  const scope = String(value || "A");
  if (scope === "BOTH") {
    if (!hasB) throw new Error("A check cannot use Source B until Source B is provided.");
    return ["SOURCE_A", "SOURCE_B"];
  }
  if (scope === "B") {
    if (!hasB) throw new Error("A check cannot use Source B until Source B is provided.");
    return ["SOURCE_B"];
  }
  return ["SOURCE_A"];
}

function Issue({ wallet, navigate }: any) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setFieldErrors({});
    if (!wallet) return setMessage("Connect the funding wallet before creating a commitment.");
    const data = new FormData(event.currentTarget);
    try {
      setBusy(true);
      const escrow = parseGen(String(data.get("escrow")));
      const sourceA = String(data.get("sourceA") || "").trim();
      const sourceB = String(data.get("sourceB") || "").trim();
      const hasB = Boolean(sourceB);
      const sources: SourceRule[] = [
        { id: "SOURCE_A", label: String(data.get("sourceALabel") || "Evidence A"), url: sourceA },
      ];
      if (hasB) sources.push({ id: "SOURCE_B", label: String(data.get("sourceBLabel") || "Evidence B"), url: sourceB });

      const checks: CheckRule[] = [1,2,3].map((index) => ({
        id: `CHECK_${index}`,
        requirement: String(data.get(`check${index}`) || "").trim(),
        weight_bps: Number(data.get(`weight${index}`)),
        source_ids: scopeFrom(data.get(`scope${index}`), hasB),
        min_available: 1,
      }));
      const total = checks.reduce((sum, check) => sum + check.weight_bps, 0);
      if (total !== 10000) throw new Error(`Check weights must total exactly 10,000 bps. Current total: ${total}.`);
      if (checks.some((check) => !check.requirement)) throw new Error("All three scorecard checks need a measurable requirement.");
      const timeline = {
        start: secondsFromDate(String(data.get("start"))),
        end: secondsFromDate(String(data.get("end"))),
        assessmentAfter: secondsFromDate(String(data.get("assessmentAfter"))),
        deadline: secondsFromDate(String(data.get("deadline"))),
      };
      try {
        validateTimeline(timeline.start, timeline.end, timeline.assessmentAfter, timeline.deadline, BigInt(Math.floor(Date.now() / 1000) + CLOCK_SKEW_MARGIN));
      } catch (reason: any) {
        const text = String(reason?.message || reason);
        const key = text.includes("start") ? "start" : text.includes("end") ? "end" : text.includes("Assessment") ? "assessmentAfter" : "deadline";
        setFieldErrors({ [key]: text });
        throw reason;
      }

      await write("create_commitment", [
        String(data.get("recipient")),
        String(data.get("title")),
        String(data.get("obligation")),
        timeline.start, timeline.end, timeline.assessmentAfter, timeline.deadline,
        escrow,
        JSON.stringify(sources),
        JSON.stringify(checks),
      ], escrow);
      navigate("/commitments");
    } catch (reason:any) {
      setMessage(reason.message || "Creation failed.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="page narrow">
    <div className="page-head"><div><span className="kicker">CREATE A FUNDED SCORECARD</span><h1>Define what “fulfilled” means.</h1><p>The funder locks the escrow before performance starts. The recipient later earns the share attached to checks that validators can verify.</p></div></div>
    <form className="form-card" onSubmit={submit}>
      <div className="form-section"><span>01 · Parties & value</span>
        <label>Recipient address<input name="recipient" required placeholder="0x…"/></label>
        <label>Escrow (GEN)<input name="escrow" required inputMode="decimal" placeholder="25"/></label>
      </div>
      <div className="form-section"><span>02 · Performance promise</span>
        <label>Commitment title<input name="title" required maxLength={140} placeholder="Warehouse fulfilment batch #24"/></label>
        <label>Overall obligation<textarea name="obligation" required maxLength={2400} placeholder="Describe the performance being funded and the business context."/></label>
      </div>
      <div className="form-section"><span>03 · Timeline</span>
        <div className="two">
          <label>Performance starts<input name="start" required type="datetime-local" aria-invalid={Boolean(fieldErrors.start)} aria-describedby="start-error"/>{fieldErrors.start && <small id="start-error" className="field-error">{fieldErrors.start}</small>}</label>
          <label>Performance ends<input name="end" required type="datetime-local" aria-invalid={Boolean(fieldErrors.end)} aria-describedby="end-error"/>{fieldErrors.end && <small id="end-error" className="field-error">{fieldErrors.end}</small>}</label>
          <label>Assessment available after<input name="assessmentAfter" required type="datetime-local" aria-invalid={Boolean(fieldErrors.assessmentAfter)} aria-describedby="assessment-error"/>{fieldErrors.assessmentAfter && <small id="assessment-error" className="field-error">{fieldErrors.assessmentAfter}</small>}</label>
          <label>Request deadline<input name="deadline" required type="datetime-local" aria-invalid={Boolean(fieldErrors.deadline)} aria-describedby="deadline-error"/>{fieldErrors.deadline && <small id="deadline-error" className="field-error">{fieldErrors.deadline}</small>}</label>
        </div>
        <p className="form-hint">Ordering required: start in the future → end → assessment opens → request deadline. A 60-second clock-skew safety margin is applied.</p>
      </div>
      <div className="form-section"><span>04 · Frozen evidence catalogue</span>
        <div className="two">
          <label>Source A label<input name="sourceALabel" required defaultValue="Operational record"/></label>
          <label>Source A HTTPS URL<input name="sourceA" required type="url" pattern="https://.*" placeholder="https://example.com/public-record"/></label>
          <label>Source B label (optional)<input name="sourceBLabel" defaultValue="Independent record"/></label>
          <label>Source B HTTPS URL (optional)<input name="sourceB" type="url" pattern="https://.*" placeholder="https://example.org/report"/></label>
        </div>
        <p className="hint">Sources are frozen data locations. Page content is treated as untrusted evidence, never as instructions to validators.</p>
      </div>
      <div className="form-section"><span>05 · Weighted fulfilment checks</span>
        {[1,2,3].map((index) => <div className="scorecard-builder" key={index}>
          <label>Check {index}<input name={`check${index}`} required maxLength={600} placeholder={index === 1 ? "Delivery completed before the agreed deadline" : index === 2 ? "Delivered quantity meets or exceeds the agreed minimum" : "Quality threshold in the public inspection record is met"}/></label>
          <div className="two">
            <label>Weight (bps)<input name={`weight${index}`} required type="number" min="1" max="10000" defaultValue={index === 1 ? 4000 : index === 2 ? 3500 : 2500}/></label>
            <label>Evidence scope<select name={`scope${index}`} defaultValue="A"><option value="A">Source A</option><option value="B">Source B</option><option value="BOTH">Source A + B</option></select></label>
          </div>
        </div>)}
        <p className="hint">All check weights must total 10,000 bps. Satisfied weight becomes the recipient’s payout percentage.</p>
      </div>
      <div className="policy-box score-policy">
        <b>Scoring</b><span>SATISFIED → earns weight</span><span>NOT SATISFIED → earns 0</span><span>UNRESOLVED → retry, never silent settlement</span>
      </div>
      {message && <div className="inline-error">{message}</div>}
      <button className="button wide" disabled={busy}>{busy ? "Submitting…" : "Fund & create scorecard"}<ArrowRight size={17}/></button>
    </form>
  </section>;
}

function Action({ enabled, label, help, onClick }: any) {
  return <div className={`action-row ${enabled ? "enabled" : ""}`}>
    <div><b>{label}</b><small>{help}</small></div>
    <button disabled={!enabled} onClick={onClick}><ArrowRight size={15}/></button>
  </div>;
}

function resultMap(record: Commitment): Map<string,string> {
  const raw = record.final_results || record.provisional_results || record.last_assessment_results || "[]";
  try {
    const items: CheckResult[] = JSON.parse(raw);
    return new Map(items.map((item) => [item.check_id, item.result]));
  } catch {
    return new Map();
  }
}

function requestHelp(record: Commitment, wallet: string): string {
  const state = requestAssessmentState(record, wallet);
  if (state === "NOT_OPEN") return `Assessment is not open yet. Opens ${toDateInput(record.assessment_after)}.`;
  if (state === "EXPIRED") return `Request window expired. Deadline was ${toDateInput(record.request_deadline)}.`;
  if (state === "NOT_ELIGIBLE") return "Only the recorded recipient can request assessment while the commitment is locked.";
  return "Recipient opens scoring after the performance window, before the request deadline.";
}

function Detail({ id, wallet }: {id:number; wallet:string}) {
  const [record, setRecord] = useState<Commitment | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const load = async () => {
    try { setRecord({ id, ...(await read("get_commitment", [id])) }); setError(""); }
    catch (reason:any) { setError(reason.message); }
  };
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const action = async (label:string, functionName:string) => {
    try {
      setBusy(label); setError("");
      const fresh = { id, ...(await read("get_commitment", [id])) } as Commitment;
      setRecord(fresh);
      if (functionName === "request_assessment") {
        const requestState = requestAssessmentState(fresh, wallet, Math.floor(Date.now() / 1000));
        if (requestState !== "AVAILABLE") throw new Error(requestHelp(fresh, wallet));
      }
      await write(functionName, [id]); await load();
    }
    catch (reason:any) { setError(reason.message); }
    finally { setBusy(""); }
  };

  const contest = async () => {
    if (!record || !selected.length) return setError("Choose at least one check to contest.");
    try {
      setBusy("contest");
      setError("");
      const scope = JSON.stringify(selected);
      const bond = BigInt(await read("quote_contest_bond", [id, scope]));
      await write("contest_checks", [id, scope], bond);
      setSelected([]);
      await load();
    } catch (reason:any) {
      setError(reason.message);
    } finally {
      setBusy("");
    }
  };

  if (error && !record) return <section className="page"><div className="empty error-panel">{error}</div></section>;
  if (!record) return <section className="page"><div className="empty">Loading commitment…</div></section>;

  const sources: SourceRule[] = JSON.parse(record.sources || "[]");
  const checks: CheckRule[] = JSON.parse(record.checks || "[]");
  const results = resultMap(record);
  const disputedWeight = checks.filter((check) => selected.includes(check.id)).reduce((sum, check) => sum + check.weight_bps, 0);
  const estimatedBond = localContestBond(record.escrow_total, disputedWeight);
  const canChooseContest = canContest(record, wallet);
  const requestState = requestAssessmentState(record, wallet, now);

  const toggle = (checkId: string) => {
    setSelected((current) => current.includes(checkId) ? current.filter((item) => item !== checkId) : [...current, checkId]);
  };

  return <section className="page">
    <div className="detail-head">
      <div><span className="kicker">COMMITMENT #{String(id).padStart(3,"0")}</span><h1>{record.title}</h1></div>
      <StatusBadge record={record}/>
    </div>

    <div className="metric-row">
      <Metric label="ESCROW" value={`${formatGen(record.escrow_total)} GEN`} note={`${formatGen(record.escrow_remaining)} GEN still locked`}/>
      <Metric label="FULFILMENT SCORE" value={`${(Number(record.final_bps || record.provisional_bps || 0)/100).toFixed(2)}%`} note="Satisfied weighted checks"/>
      <Metric label="RECIPIENT PAID" value={`${formatGen(record.recipient_paid)} GEN`} note={`${formatGen(record.funder_returned)} GEN returned to funder`}/>
    </div>

    <div className="detail-grid">
      <div className="stack">
        <article className="panel">
          <span className="panel-label">Frozen performance promise</span>
          <p className="obligation">{record.obligation}</p>
          <div className="party-grid">
            <span><small>FUNDER</small><b>{record.funder}</b></span>
            <span><small>RECIPIENT</small><b>{record.recipient}</b></span>
          </div>
        </article>

        <article className="panel">
          <span className="panel-label">Evidence catalogue</span>
          {sources.map((source) => <div className="rule-row" key={source.id}>
            <div><b>{source.label}</b><small>{source.id}</small></div>
            <a href={source.url} target="_blank" rel="noreferrer">Open source</a>
          </div>)}
        </article>

        <article className="panel">
          <span className="panel-label">Fulfilment scorecard</span>
          {checks.map((check) => {
            const result = results.get(check.id) || "PENDING";
            return <div className={`score-row result-${result.toLowerCase().replaceAll("_","-")}`} key={check.id}>
              <div className="score-main">
                {canChooseContest && <input aria-label={`Contest ${check.id}`} type="checkbox" checked={selected.includes(check.id)} onChange={() => toggle(check.id)}/>} 
                <div><b>{check.requirement}</b><small>{check.id} · evidence: {check.source_ids.join(", ")}</small></div>
              </div>
              <div className="score-meta"><strong>{(check.weight_bps/100).toFixed(2)}%</strong><span>{result.replaceAll("_"," ")}</span></div>
            </div>;
          })}
          {canChooseContest && <div className="contest-box">
            <span>Selected disputed weight: {(disputedWeight/100).toFixed(2)}%</span>
            <span>Estimated bond: {formatGen(estimatedBond)} GEN</span>
            <button className="button compact" disabled={!selected.length || Boolean(busy)} onClick={contest}>Contest selected checks</button>
          </div>}
        </article>
      </div>

      <aside className="panel action-panel">
        <span className="panel-label">Available actions</span>
        <Action enabled={requestState === "AVAILABLE"} label="Request assessment" help={requestHelp(record, wallet)} onClick={() => action("request","request_assessment")}/>
        <Action enabled={canAssess(record)} label="Assess scorecard" help="Permissionless. Validators evaluate each check only against its scoped sources." onClick={() => action("assess","assess_commitment")}/>
        <Action enabled={canResolveContest(record)} label="Resolve contest" help={record.contest_attempts >= MAX_CONTEST_ATTEMPTS ? "Contest attempts exhausted." : "Re-assesses only the selected disputed checks."} onClick={() => action("resolve","resolve_contest")}/>
        <Action enabled={canFinalize(record)} label="Finalize score" help="After the contest window, deterministic code pays the satisfied share." onClick={() => action("finalize","finalize_assessment")}/>
        <Action enabled={statusLabel(record.status)==="LOCKED" && Date.now()/1000>Number(record.request_deadline)} label="Recover unclaimed" help="Returns escrow if the recipient never requests assessment in time." onClick={() => action("recover","recover_unclaimed")}/>
        <Action enabled={canRecoverUnresolved(record)} label="Recover unresolved" help="Available after the attempt cap or assessment grace, including the retry interval." onClick={() => action("unresolved","recover_unresolved")}/>
        <Action enabled={canFinalizeStalledContest(record)} label="Close stalled contest" help="Available after the contest attempt cap or grace, including the retry interval." onClick={() => action("stalled","finalize_stalled_contest")}/>
        {busy && <div className="action-note">Transaction pending: {busy}</div>}
        {error && <div className="inline-error">{error}</div>}
      </aside>
    </div>

    <article className="panel timeline">
      <span className="panel-label">Timeline</span>
      <div><span>Performance</span><b>{toDateInput(record.performance_start)} → {toDateInput(record.performance_end)}</b></div>
      <div><span>Assessment after</span><b>{toDateInput(record.assessment_after)}</b></div>
      <div><span>Request deadline</span><b>{toDateInput(record.request_deadline)}</b></div>
        <div><span>Assessment attempts</span><b>{String(record.assessment_attempts)} / {MAX_ASSESSMENT_ATTEMPTS}</b></div>
        <div><span>Contest attempts</span><b>{String(record.contest_attempts)} / {MAX_CONTEST_ATTEMPTS}</b></div>
    </article>
  </section>;
}

function WalletList({ navigate, wallet, mode }: any) {
  if (!wallet) return <section className="page"><div className="empty"><Wallet size={30}/><h3>Connect your wallet</h3><p>This view filters public commitments by your connected address.</p></div></section>;
  const key = mode === "recipient" ? "recipient" : "funder";
  return <CommitmentList navigate={navigate} filter={(record) => String(record[key]).toLowerCase() === wallet.toLowerCase()}/>;
}

function About() {
  return <section className="page narrow">
    <div className="page-head"><div><span className="kicker">DESIGN PRINCIPLES</span><h1>Fulfilment is a scorecard.</h1><p>Fulfill decomposes a performance promise into independently assessable facts instead of asking validators for one global verdict.</p></div></div>
    <div className="about-stack">
      <article className="panel"><b>1 · Fund before performance starts.</b><p>The funder freezes the recipient, overall obligation, timing, source catalogue and weighted checks before the facts are known.</p></article>
      <article className="panel"><b>2 · Scope evidence to each check.</b><p>Every requirement explicitly names the source IDs that can prove it. Evidence authority is local to the fact being assessed.</p></article>
      <article className="panel"><b>3 · Validators assess facts, not compensation.</b><p>Each check can be SATISFIED, NOT SATISFIED or UNRESOLVED. GenLayer never selects a payout percentage.</p></article>
      <article className="panel"><b>4 · Contest only what is disputed.</b><p>A party selects specific check IDs. The bond is calculated from the value represented by those checks, not the whole escrow.</p></article>
      <article className="panel"><b>5 · Code settles the score.</b><p>Satisfied weights are summed deterministically. The recipient receives escrow × satisfied basis points and the remainder returns to the funder.</p></article>
    </div>
  </section>;
}

function App() {
  const route = useRoute();
  const walletState = useWallet();
  const detail = route.path.match(/^\/commitment\/(\d+)$/);
  const content = useMemo(() => {
    if (detail) return <Detail id={Number(detail[1])} wallet={walletState.wallet}/>;
    if (route.path === "/commitments") return <CommitmentList navigate={route.navigate}/>;
    if (route.path === "/issue") return <Issue wallet={walletState.wallet} navigate={route.navigate}/>;
    if (route.path === "/my-recipient") return <WalletList navigate={route.navigate} wallet={walletState.wallet} mode="recipient"/>;
    if (route.path === "/my-funded") return <WalletList navigate={route.navigate} wallet={walletState.wallet} mode="funder"/>;
    if (route.path === "/about") return <About/>;
    return <Home navigate={route.navigate}/>;
  }, [route.path, walletState.wallet]);
  return <Shell walletState={walletState} navigate={route.navigate}>{content}</Shell>;
}

createRoot(document.getElementById("root")!).render(<App/>);
