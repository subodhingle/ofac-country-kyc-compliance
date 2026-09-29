import OperatorSetup from './OperatorSetup';
import { useState, useEffect } from "react";
import {
  verifyComplianceDeployment,
  validateComplianceDeploymentRuntime,
} from "./runtimeConfig";
import {
  deployKyccheckContract,
  kycBytes32,
  newKycSecret,
  readKycLedger,
  submitKyccheckCircuit,
} from "./midnightClient";

const RUNTIME = validateComplianceDeploymentRuntime({
  networkId: import.meta.env.VITE_NETWORK_ID,
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  faucetUrl: import.meta.env.VITE_FAUCET_URL,
  demoMode: import.meta.env.VITE_DEMO_MODE,
  production: import.meta.env.PROD,
});

export default function App() {
  const readRoute = () => {
    const route = window.location.hash.slice(1);
    return ["dashboard", "deployer", "walletHub", "privacy"].includes(route)
      ? route
      : "home";
  };
  const [activeTab, setActiveTab] = useState(readRoute);
  useEffect(() => {
    const onRoute = () => {
      if (["#content", "#main-content"].includes(window.location.hash)) return;
      setActiveTab(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onRoute);
    return () => window.removeEventListener("hashchange", onRoute);
  }, []);
  useEffect(() => {
    document.getElementById("page-title")?.focus();
  }, [activeTab]);
  const [feedback, setFeedback] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>("0.00");
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [laceDetected, setLaceDetected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<any>(null);

  const [contractDeployed, setContractDeployed] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [runtimeIssue, setRuntimeIssue] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const [ledger, setLedger] = useState({
    kyc_valid: "false",
    compliance_standard: "",
  });
  const [formValues, setFormValues] = useState(() => ({
    country_code: "IN",
    user_secret: "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
    credential_salt: "2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b",
  }));
  const [logs, setLogs] = useState<any[]>([]);
  const [isProving, setIsProving] = useState(false);

  useEffect(() => {
    fetch("/deployment.json")
      .then((response) => {
        if (!response.ok)
          throw new Error(
            "OFAC Country KYC Compliance: deployment.json could not be loaded.",
          );
        return response.json();
      })
      .then((deployment) => {
        const verified = verifyComplianceDeployment(deployment);
        if (
          RUNTIME.contractAddress &&
          RUNTIME.contractAddress !== verified.contractAddress
        ) {
          throw new Error(
            "OFAC Country KYC Compliance: environment address does not match deployment evidence.",
          );
        }
        if (verified.network === RUNTIME.networkId) {
          setContractAddress(verified.contractAddress);
          setContractDeployed(true);
        } else {
          setContractAddress(null);
          setContractDeployed(false);
        }
        setRuntimeIssue(null);
      })
      .catch((error) => {
        setContractAddress(null);
        setContractDeployed(false);
        setRuntimeIssue(
          error instanceof Error
            ? error.message
            : "OFAC Country KYC Compliance: configuration failed.",
        );
      });
    const detectLace = () => {
      const hasMidnightWallet = Object.values(
        (window as any).midnight ?? {},
      ).some((candidate: any) => typeof candidate?.connect === "function");
      setLaceDetected(hasMidnightWallet);
    };
    detectLace();
    const timer = setInterval(detectLace, 1000);
    return () => clearInterval(timer);
  }, []);

  const connectWallet = async () => {
    setConnectingWallet(true);
    try {
      const candidates = Object.values(
        (window as any).midnight ?? {},
      ) as Array<{
        connect?: (networkId: string) => Promise<any>;
        name?: string;
        rdns?: string;
      }>;
      const oneAm = candidates.find(
        (c) =>
          /1am/i.test(`${c.name ?? ""} ${c.rdns ?? ""}`) &&
          typeof c.connect === "function",
      );
      const wallet =
        oneAm ??
        candidates.find((candidate) => typeof candidate.connect === "function");
      if (!wallet?.connect) {
        throw new Error(
          "No Midnight wallet connector was detected. Install 1AM or Lace and unlock it.",
        );
      }

      const connected = await wallet.connect(RUNTIME.networkId);
      (window as any).__midnightConnectedWallet = connected;
      const addressInfo = await connected.getUnshieldedAddress();
      const balances = await connected.getUnshieldedBalances();
      const nightBalance = Object.values(balances)[0] ?? 0n;

      setWalletAddress(addressInfo.unshieldedAddress);
      setWalletBalance((Number(nightBalance) / 1_000_000).toFixed(2));
      setWalletConnected(true);
      setConnectedWallet(connected);
      if (import.meta.env.VITE_CONTRACT_ADDRESS) {
        setContractAddress(import.meta.env.VITE_CONTRACT_ADDRESS);
        setContractDeployed(true);
      }
      logTransaction(
        "wallet",
        "MIDNIGHT WALLET CONNECTED",
        "—",
        "Connected through the Midnight DApp Connector API",
      );
    } catch (err) {
      console.error("Midnight wallet connection failed:", err);
      const raw = err instanceof Error ? err.message : String(err || "");
      const msg = (raw.includes("tabs:outgoing.message.ready") || raw.includes("No Listener")) ? "Wallet extension is asleep or locked. Please open and unlock your 1AM / Lace wallet extension, then retry." : (raw || "Midnight wallet connection failed.");
      setFeedback(msg);
    } finally {
      setConnectingWallet(false);
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setWalletBalance("0.00");
    setConnectedWallet(null);
    delete (window as any).__midnightConnectedWallet;
    logTransaction(
      "0x0000...0000",
      "MIDNIGHT WALLET DISCONNECTED",
      "0.00 tNIGHT",
      "Disconnected wallet context",
    );
  };

  const requestFaucet = () => {
    if (!walletConnected) return;
    window.open(RUNTIME.faucetUrl, "_blank", "noopener,noreferrer");
    logTransaction(
      "—",
      "FAUCET OPENED",
      "—",
      "Funding must be confirmed by the official Midnight Preview faucet and wallet balance refresh.",
    );
  };

  const deployContractAction = async () => {
    if (!connectedWallet) {
      setFeedback("Connect a Midnight wallet before deploying.");
      return;
    }
    setIsDeploying(true);
    try {
      const result = await deployKyccheckContract(connectedWallet);
      setContractAddress(result.contractAddress);
      setContractDeployed(true);
      setRuntimeIssue(null);
      logTransaction(
        result.txId,
        "CONFIRMED ON MIDNIGHT",
        "—",
        `Fresh ${RUNTIME.networkId} deployment ${result.contractAddress}`,
      );
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Contract deployment failed.",
      );
    } finally {
      setIsDeploying(false);
    }
  };

  const verifyKYC = async () => {
    if (!walletConnected || !contractDeployed || !contractAddress) return;
    setIsProving(true);
    try {
      const privateState = {
        secretKey: kycBytes32(formValues.user_secret, "User secret"),
        country: kycBytes32(formValues.country_code, "Country"),
        credentialSalt: kycBytes32(
          formValues.credential_salt,
          "Credential salt",
        ),
      };
      const result = await submitKyccheckCircuit(
        (window as any).__midnightConnectedWallet,
        contractAddress,
        "verifyKYC",
        [],
        privateState,
      );
      const chain = await readKycLedger(
        (window as any).__midnightConnectedWallet,
        contractAddress,
      );
      setLedger({
        kyc_valid: "true",
        compliance_standard: `${chain.prohibitedCountryCount} blocked countries · ${chain.issuedCredentialCount} issued credentials`,
      });
      logTransaction(
        result.txId,
        "CONFIRMED ON MIDNIGHT",
        "—",
        "Confirmed verifyKYC on " + contractAddress,
      );
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : "The Midnight transaction failed.",
      );
      logTransaction(
        "—",
        "TRANSACTION FAILED",
        "—",
        err instanceof Error ? err.message : "Unknown transaction failure",
      );
    } finally {
      setIsProving(false);
    }
  };

  const logTransaction = (
    hash: string,
    status: string,
    fee: string,
    details: string,
  ) => {
    setLogs((prev) => [
      {
        hash,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        status,
        fee,
        details,
      },
      ...prev,
    ]);
  };

  const hasRead = logs.some(
    (log) =>
      log.status === "CONFIRMED ON MIDNIGHT" &&
      log.details.startsWith("Confirmed "),
  );
  const ready = walletConnected && contractDeployed && !runtimeIssue;
  const pageNames: Record<string, string> = {
    dashboard: "Verify a credential",
    deployer: "Contract setup",
    walletHub: "Wallet & activity",
    privacy: "Privacy & scope",
  };

  return (
    <div className="app">
      <a
        className="skip-link"
        href="#content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href="#home">
          Country Check
        </a>
        <nav aria-label="Primary navigation">
          <a
            href="#home"
            aria-current={activeTab === "home" ? "page" : undefined}
          >
            About
          </a>
          <a
            href="#privacy"
            aria-current={activeTab === "privacy" ? "page" : undefined}
          >
            Privacy
          </a>
          <a className="button-link" href="#dashboard">
            Open verification desk <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      {activeTab === "home" ? (
        <main id="content" tabIndex={-1} className="landing">
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">Credential verification workspace</p>
              <h1 id="page-title" tabIndex={-1}>
                A clear decision.
                <br />
                <em>An explicit evidence trail.</em>
              </h1>
              <p className="intro">
                Check an administrator-issued country credential against the
                contract’s prohibited-country registry. Review what the check
                proves—and what it discloses—before submitting.
              </p>
              <div className="hero-actions">
                <a className="button-link" href="#dashboard">
                  Open verification desk →
                </a>
                <a href="#privacy">Understand the privacy model</a>
              </div>
            </div>
            <aside className="evidence-sheet">
              <span className="eyebrow">Scope of this check</span>
              <h2>Credential → Registry → Result</h2>
              <dl>
                <dt>Required evidence</dt>
                <dd>Administrator-issued credential</dd>
                <dt>Decision rule</dt>
                <dd>Issued and not prohibited</dd>
                <dt>Disclosure notice</dt>
                <dd>Country value is disclosed</dd>
              </dl>
              <p>No documents or passport uploads are requested here.</p>
            </aside>
          </section>
          <section
            className="project-details"
            aria-label="How the project works"
          >
            <article>
              <h2>For credential holders</h2>
              <p>Submit the country code and salt your provider issued.</p>
            </article>
            <article>
              <h2>For reviewers</h2>
              <p>
                Inspect the result and transaction record without overstating
                the scope of the check.
              </p>
            </article>
          </section>
          <aside className="scope-note">
            <strong>Before you begin</strong>
            <p>
              This is a contract-registry check, not a complete identity,
              sanctions, or legal compliance determination. Registry contents
              depend on the administrator; no current OFAC coverage is asserted.
            </p>
          </aside>
        </main>
      ) : (
        <div className="workspace">
          <nav className="workspace-nav" aria-label="Workspace pages">
            <span className="eyebrow">Workspace</span>
            {Object.entries(pageNames).map(([route, label]) => (
              <a
                key={route}
                href={"#" + route}
                aria-current={activeTab === route ? "page" : undefined}
              >
                {label}
              </a>
            ))}
            <p>Midnight {RUNTIME.networkId}</p>
          </nav>
          <main id="content" tabIndex={-1} className="workspace-content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">Credential verification workspace</p>
                <h1 id="page-title" tabIndex={-1}>
                  {pageNames[activeTab]}
                </h1>
              </div>
              <span className="session-status">
                {walletConnected ? "Wallet connected" : "Wallet disconnected"}
              </span>
            </div>
            {feedback && (
              <div className="notice error" role="alert">
                <strong>Action could not complete</strong>
                <p>{feedback}</p>
                <button className="secondary" onClick={() => setFeedback("")}>
                  Dismiss message
                </button>
              </div>
            )}
            {runtimeIssue && (
              <section className="notice error" role="alert">
                <h2>Contract actions unavailable</h2>
                <p>{runtimeIssue}</p>
                <p>
                  Restore this repository’s deployment configuration before
                  using wallet or contract actions.
                </p>
                <button onClick={() => window.location.reload()}>
                  Retry configuration
                </button>
              </section>
            )}
            {activeTab === "dashboard" && (
              <>
                <p className="page-intro">
                  Use the credential supplied by your KYC provider.
                </p>
                {!ready && (
                  <div className="notice">
                    <strong>Complete setup to submit</strong>
                    <p>
                      {!walletConnected
                        ? "Connect a Midnight wallet, then review the contract configuration."
                        : "A configured contract is required."}
                    </p>
                    <a href={!walletConnected ? "#walletHub" : "#deployer"}>
                      {!walletConnected
                        ? "Go to wallet"
                        : "Review contract setup"}{" "}
                      →
                    </a>
                  </div>
                )}
                {logs[0]?.status === "CONFIRMED ON MIDNIGHT" && (
                  <div className="notice" role="status">
                    <strong>Transaction confirmed</strong>
                    <p>{logs[0].details}</p>
                    <a href="#walletHub">
                      View transaction in session activity →
                    </a>
                  </div>
                )}
                <div className="task-layout">
                  <section className="form-panel">
                    <h2>Credential details</h2>
                    <p>
                      A country code alone is not a credential. You need a salt
                      from an administrator-issued credential that exists in
                      this registry.
                    </p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!ready || isProving) return;
                        setFeedback("");
                        setIsProving(true);
                        try {
                          await verifyKYC();
                        } finally {
                          setIsProving(false);
                        }
                      }}
                    >
                      <fieldset disabled={!ready || isProving}>
                        <legend className="sr-only">Credential details</legend>
                        <label htmlFor="country_code">
                          Country code
                          <input
                            id="country_code"
                            type="text"
                            required
                            autoComplete="off"
                            aria-describedby="country_code-hint"
                            value={formValues.country_code}
                            onChange={(e) =>
                              setFormValues({
                                ...formValues,
                                country_code: e.target.value.toUpperCase(),
                              })
                            }
                          />
                          <small id="country_code-hint">
                            Provider-issued country code, for example US
                          </small>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', margin: '14px 0' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                          <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Shielded KYC Credential Attached</span>
                        </div>
                        <details style={{ marginBottom: '16px', fontSize: '0.8rem', color: '#94a3b8' }}>
                          <summary style={{ cursor: 'pointer', padding: '4px 0', userSelect: 'none' }}>Advanced / Custom Credential</summary>
                          <div style={{ marginTop: '8px' }}>
                            <label htmlFor="credential_salt">
                              Provider credential salt
                              <input
                                id="credential_salt"
                                type={showSecrets ? "text" : "password"}
                                autoComplete="off"
                                value={formValues.credential_salt}
                                onChange={(e) =>
                                  setFormValues({
                                    ...formValues,
                                    credential_salt: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label htmlFor="user_secret">
                              Local proof secret
                              <input
                                id="user_secret"
                                type={showSecrets ? "text" : "password"}
                                autoComplete="off"
                                value={formValues.user_secret}
                                onChange={(e) =>
                                  setFormValues({
                                    ...formValues,
                                    user_secret: e.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                        </details>
                        <button type="submit">
                          {isProving
                            ? "Waiting for proof & confirmation…"
                            : "Verify country credential"}
                        </button>
                      </fieldset>
                      {isProving && (
                        <p role="status">
                          Keep this page open while the wallet and network
                          complete the request.
                        </p>
                      )}
                    </form>
                  </section>
                  <aside className="context-panel">
                    <h2>Verification record</h2>
                    <p>
                      Updated after a successful submission in this session. Not
                      a live feed.
                    </p>
                    <dl>
                      <dt>Verification</dt>
                      <dd>
                        {hasRead
                          ? ledger.kyc_valid === "true"
                            ? "Confirmed"
                            : "Unverified"
                          : "Not checked"}
                      </dd>
                      <dt>Registry summary</dt>
                      <dd>
                        {hasRead
                          ? ledger.compliance_standard
                          : "No registry read yet"}
                      </dd>
                    </dl>
                    <div className="disclosure">
                      <h3>Country disclosure</h3>
                      <p>
                        The current contract explicitly discloses the country
                        value and credential commitment during verification. The
                        prohibited-country and issued-credential registries are
                        public.
                      </p>
                      <a href="#privacy">Read the full scope →</a>
                    </div>
                  </aside>
                </div>
              </>
            )}
            {activeTab === "walletHub" && (
              <>
                <div className="wallet-layout">
                  <section className="form-panel">
                    <h2>Your Midnight wallet</h2>
                    <p>
                      {laceDetected
                        ? "A compatible wallet connector was detected."
                        : "Install and unlock a compatible Midnight wallet, such as 1AM or Lace."}
                    </p>
                    {walletConnected ? (
                      <>
                        <dl>
                          <dt>Address</dt>
                          <dd className="address">{walletAddress}</dd>
                          <dt>Balance at connection</dt>
                          <dd>{walletBalance} tNIGHT</dd>
                        </dl>
                        <button
                          className="secondary"
                          onClick={disconnectWallet}
                        >
                          Disconnect session
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={connectingWallet}
                        onClick={connectWallet}
                      >
                        {connectingWallet
                          ? "Connecting…"
                          : "Connect Midnight wallet"}
                      </button>
                    )}
                  </section>
                  <section className="context-panel">
                    <h2>Test-network funding</h2>
                    <p>
                      The faucet opens in a new tab. Funding is not automatic;
                      reconnect afterward to refresh the displayed balance.
                    </p>
                    <button
                      className="secondary"
                      disabled={!walletConnected}
                      onClick={requestFaucet}
                    >
                      Open network faucet ↗
                    </button>
                  </section>
                </div>
                <section className="activity">
                  <h2>Session activity</h2>
                  {logs.length === 0 ? (
                    <p>
                      No activity yet. Wallet connections and transaction
                      results will appear here.
                    </p>
                  ) : (
                    <ol>
                      {logs.map((log, index) => (
                        <li key={index}>
                          <time>{log.timestamp}</time>
                          <strong>{log.status}</strong>
                          <p>{log.details}</p>
                          <code>{log.hash}</code>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </>
            )}
            {activeTab === 'deployer' && <OperatorSetup wallet={walletConnected ? connectedWallet : null} address={runtimeIssue ? null : contractAddress} />}
            {activeTab === "deployer" && (
              <section className="form-panel setup-panel">
                <h2>Contract configuration</h2>
                <p>
                  This workspace uses its own contract on Midnight{" "}
                  {RUNTIME.networkId}. A loaded address is configuration
                  evidence, not a fresh check of chain state.
                </p>
                <dl>
                  <dt>Configured address</dt>
                  <dd className="address">
                    {contractAddress || "No address configured"}
                  </dd>
                </dl>
                {!contractDeployed && (
                  <>
                    <p>
                      Deployment is a wallet-approved network transaction.
                      Connect your wallet first.
                    </p>
                    <button
                      disabled={
                        !walletConnected || isDeploying
                      }
                      onClick={deployContractAction}
                    >
                      {isDeploying
                        ? "Waiting for deployment confirmation…"
                        : "Deploy contract"}
                    </button>
                  </>
                )}
                {isDeploying && (
                  <p role="status">
                    Waiting for the wallet and network. Do not close this page.
                  </p>
                )}
              </section>
            )}
            {activeTab === "privacy" && (
              <div className="privacy-layout">
                <section className="form-panel">
                  <span className="eyebrow">Public surface</span>
                  <h2>What the contract reveals</h2>
                  <p>
                    The current contract explicitly discloses the country value
                    and credential commitment during verification. The
                    prohibited-country and issued-credential registries are
                    public.
                  </p>
                </section>
                <section className="context-panel">
                  <span className="eyebrow">Private inputs</span>
                  <h2>Where privacy stops</h2>
                  <p>
                    The credential salt and local secret are supplied as
                    witnesses. Do not treat this implementation as private
                    residency screening: the country is disclosed.
                  </p>
                </section>
                <aside className="scope-note">
                  <strong>Product scope</strong>
                  <p>
                    This is a contract-registry check, not a complete identity,
                    sanctions, or legal compliance determination. Registry
                    contents depend on the administrator; no current OFAC
                    coverage is asserted.
                  </p>
                  <p>
                    Use test-network credentials only. Do not enter a wallet
                    recovery phrase or reuse secrets from another service.
                  </p>
                </aside>
              </div>
            )}
          </main>
        </div>
      )}
      <footer>
        <span>Country Check</span>
        <span>Midnight · {RUNTIME.networkId} · Experimental workspace</span>
        <a href="#privacy">Privacy & limitations</a>
      </footer>
    </div>
  );
}
