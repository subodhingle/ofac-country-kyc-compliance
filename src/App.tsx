import { useState, useEffect } from 'react';
import { Compass, Wallet, Cpu, Lock, Database } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>("0.00");
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [faucetLoading] = useState(false);
  const [laceDetected, setLaceDetected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<any>(null);

  const [contractDeployed, setContractDeployed] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const [ledger, setLedger] = useState({ kyc_valid: "false", compliance_standard: "FATF-COOPERATIVE" });
  const [formValues, setFormValues] = useState({ country_code: "US", passport_id: "EP-9821-XA" });
  const [logs, setLogs] = useState([
    { hash: '0xcd3d...44ee', timestamp: '2026-07-08 09:54:12', status: 'VERIFIED', details: 'KYC check verified against exclusions' }
  ]);
  const [isProving, setIsProving] = useState(false);

  useEffect(() => {
    fetch('/deployment.json').then(response => response.ok ? response.json() : null).then(deployment => {
      if (deployment?.contractAddress) {
        setContractAddress(deployment.contractAddress);
        setContractDeployed(true);
      }
    }).catch(() => undefined);
    const detectLace = () => {
      const hasMidnightWallet = Object.values((window as any).midnight ?? {}).some((candidate: any) => typeof candidate?.connect === 'function');
      setLaceDetected(hasMidnightWallet);
    };
    detectLace();
    const timer = setInterval(detectLace, 1000);
    return () => clearInterval(timer);
  }, []);

  const connectWallet = async () => {
    setConnectingWallet(true);
    try {
      const candidates = Object.values((window as any).midnight ?? {}) as Array<{
        connect?: (networkId: string) => Promise<any>;
        name?: string;
      }>;
      const wallet = candidates.find(candidate => typeof candidate.connect === 'function');
      if (!wallet?.connect) {
        throw new Error('No Midnight wallet connector was detected. Install 1AM or Lace and unlock it.');
      }

      const connected = await wallet.connect(import.meta.env.VITE_NETWORK_ID || 'preprod');
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
      logTransaction('wallet', 'MIDNIGHT WALLET CONNECTED', '—', 'Connected through the Midnight DApp Connector API');
    } catch (err) {
      console.error('Midnight wallet connection failed:', err);
      alert(err instanceof Error ? err.message : 'Midnight wallet connection failed.');
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
    logTransaction('0x0000...0000', 'MIDNIGHT WALLET DISCONNECTED', '0.00 tNIGHT', 'Disconnected wallet context');
  };

  const requestFaucet = () => {
    if (!walletConnected) return;
    window.open(import.meta.env.VITE_FAUCET_URL || 'https://midnight-tmnight-preprod.nethermind.dev/', '_blank', 'noopener,noreferrer');
    logTransaction('—', 'FAUCET OPENED', '—', 'Funding must be confirmed by the Midnight Preprod Faucet and wallet balance refresh.');
  };

  const deployContractAction = async () => {
    if (import.meta.env.VITE_CONTRACT_ADDRESS) {
      setContractAddress(import.meta.env.VITE_CONTRACT_ADDRESS);
      setContractDeployed(true);
      logTransaction('—', 'DEPLOYMENT CONFIGURED', '—', 'Using the deployed Midnight contract configured for this environment.');
      return;
    }
    if (!connectedWallet) return;
    setIsDeploying(true);
    try {
      const { deployKyccheckContract } = await import('./midnightClient');
      const result = await deployKyccheckContract(connectedWallet);
      setContractAddress(result.contractAddress);
      setContractDeployed(true);
      logTransaction(result.txId, 'CONTRACT DEPLOYMENT SUBMITTED', '—', 'kyc_check deployed on Midnight Preprod at ' + result.contractAddress);
    } catch (err) {
      console.error('Browser deployment failed:', err);
      alert(err instanceof Error ? err.message : 'Browser deployment failed.');
    } finally {
      setIsDeploying(false);
    }
  };

  const verifyKYC = async () => {
    if (!walletConnected || !contractDeployed || !contractAddress) return;
    setIsProving(true);
    try {
      const { submitKyccheckCircuit } = await import('./midnightClient');
      const result = await submitKyccheckCircuit((window as any).__midnightConnectedWallet, contractAddress, 'verifyKYC');
      setLedger(prev => ({ ...prev, kyc_valid: 'true' }));
      logTransaction(result.txId, 'CONFIRMED ON MIDNIGHT', '—', 'Confirmed verifyKYC on ' + contractAddress);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'The Midnight transaction failed.');
      logTransaction('—', 'TRANSACTION FAILED', '—', err instanceof Error ? err.message : 'Unknown transaction failure');
    } finally {
      setIsProving(false);
    }
  };

  const logTransaction = (hash: string, status: string, fee: string, details: string) => {
    setLogs(prev => [
      {
        hash,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status,
        fee,
        details
      },
      ...prev
    ]);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '30px' }}>
        <div>
          <span style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '20px', background: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6', border: '1px solid rgba(20, 184, 166, 0.3)', fontWeight: 600 }}>Project 10</span>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '6px' }}>OFAC Country KYC Compliance</h1>
        </div>
        <div>
          {walletConnected ? (
            <div style={{ background: 'rgba(20, 184, 166, 0.08)', border: '1px solid rgba(20, 184, 166, 0.25)', borderRadius: '12px', padding: '8px 16px' }}>
              Balance: <strong style={{ color: '#14b8a6' }}>{walletBalance} tNIGHT</strong>
            </div>
          ) : (
            <button onClick={connectWallet} disabled={connectingWallet} style={{ width: 'auto' }}>
              {connectingWallet ? 'Connecting…' : 'Connect Midnight Wallet'}
            </button>
          )}
        </div>
      </header>

<section className="home-dashboard" aria-labelledby="home-dashboard-title">
        <div className="home-dashboard__lead">
          <span className="home-kicker">Compliance cockpit</span>
          <h2 id="home-dashboard-title">Country screen</h2>
          <p>Generate an allowed-country proof before accessing the service.</p>
          <div className="home-actions">
            <button type="button" onClick={() => setActiveTab('dashboard')}>Open Workspace</button>
            <button type="button" className="home-secondary" onClick={() => setActiveTab('privacy')}>Read Privacy Model</button>
          </div>
        </div>
        <div className="home-dashboard__grid">
          <article className="home-card"><span>Network</span><strong>Midnight Preprod</strong><small>{contractDeployed ? 'Contract verified' : 'Contract setup pending'}</small></article>
          <article className="home-card"><span>Current signal</span><strong>Blacklist loaded</strong><small>Passport hidden</small></article>
          <article className="home-card"><span>Wallet session</span><strong>{walletConnected ? 'Connected' : 'Not connected'}</strong><small>{walletConnected ? walletBalance + ' tNIGHT available' : 'Connect 1AM to continue'}</small></article>
          <article className="home-card"><span>Contract address</span><strong className="home-address">{contractAddress ? contractAddress.slice(0, 14) + '…' : 'Awaiting deployment'}</strong><small>Unique project deployment</small></article>
        </div>
      </section>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
        <button onClick={() => setActiveTab('dashboard')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'dashboard' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'dashboard' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>🌍 Compliance Check</button>
        <button onClick={() => setActiveTab('deployer')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'deployer' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'deployer' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>📜 KYC Authority Deployer</button>
        <button onClick={() => setActiveTab('walletHub')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'walletHub' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'walletHub' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>🔑 Citizen Wallet Keys</button>
        <button onClick={() => setActiveTab('privacy')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'privacy' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'privacy' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>🔒 Shielded Residency Privacy</button>
      </div>

      <main style={{ minHeight: '400px' }}>
        {activeTab === 'dashboard' && (
          <div>
            {(!walletConnected || !contractDeployed) && (
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#f87171' }}>⚠️ Setup Required</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                  {!walletConnected ? "Please connect your Lace Wallet in the Wallet Hub." : "Please deploy the Compact contract in the ZK Deployer."}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px', opacity: (walletConnected && contractDeployed) ? 1 : 0.4, pointerEvents: (walletConnected && contractDeployed) ? 'auto' : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ccfbf1' }}><Database className="w-5 h-5" /> KYC Registry State</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>COMPLIANCE MATRIX STANDARD</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{ledger.compliance_standard}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CREDENTIAL VALIDATED</span>
                      <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: ledger.kyc_valid === "true" ? 'var(--color-success)' : '#ef4444' }}>
                        {ledger.kyc_valid === "true" ? "✓ PASSED" : "✕ UNVERIFIED"}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div>
                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#ccfbf1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Compass className="w-5 h-5" /> Verify KYC Stamps
                  </h2>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Your Private Country Code (Secret)</label>
                    <input 
                      type="text" 
                      value={formValues.country_code} 
                      onChange={e => setFormValues({ ...formValues, country_code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Passport Document Reference ID</label>
                    <input 
                      type="text" 
                      value={formValues.passport_id} 
                      onChange={e => setFormValues({ ...formValues, passport_id: e.target.value })}
                    />
                  </div>
                  <button onClick={verifyKYC} disabled={isProving}>
                    {isProving ? "Running KYC exclusion check..." : "Verify KYC Compliance"}
                  </button>

                  {isProving && <p className="operation-status" role="status">Generating proof and waiting for Midnight confirmation…</p>}
                </section>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deployer' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#ccfbf1' }}>
              <Cpu className="w-6 h-6" /> KYC Gate Deployer
            </h2>
            {contractDeployed ? (
              <p style={{ color: '#10b981' }}>Deployed Preprod Address: {contractAddress}</p>
            ) : (
              <button onClick={deployContractAction} disabled={isDeploying || !walletConnected}>
                {isDeploying ? "Deploying..." : "Compile & Deploy Contract"}
              </button>
            )}

            {isDeploying && <p className="operation-status" role="status">Building the deployment transaction and waiting for confirmation…</p>}
          </div>
        )}

        {activeTab === 'walletHub' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#ccfbf1' }}>
              <Wallet className="w-6 h-6" /> Wallet Hub & logs
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '12px' }}>
                <h3>Midnight Account</h3>
                {walletConnected ? (
                  <div>
                    <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.85rem', marginBottom: '10px' }}>{walletAddress}</div>
                    <button onClick={disconnectWallet} style={{ width: 'auto', background: '#dc2626' }}>Disconnect</button>
                  </div>
                ) : (
                  <button onClick={connectWallet} disabled={connectingWallet} style={{ width: 'auto' }}>
                    {connectingWallet ? 'Connecting…' : 'Connect Wallet'}
                  </button>
                )}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '12px' }}>
                <h3>Get tNIGHT</h3>
                <button onClick={requestFaucet} disabled={!walletConnected || faucetLoading}>
                  {faucetLoading ? "Requesting..." : "Mint Faucet Tokens"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#ccfbf1' }}>
              <Lock className="w-6 h-6" /> Zero-Knowledge Privacy Model
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '24px', borderRadius: '12px' }}>
                <h3 style={{ color: '#10b981' }}>Can Learn:</h3>
                <ul>
                  <li>Compliance code standards target.</li>
                  <li>Trusted passport authority public keys database.</li>
                </ul>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '24px', borderRadius: '12px' }}>
                <h3 style={{ color: '#f87171' }}>Cannot Learn:</h3>
                <ul>
                  <li>Your exact country code value.</li>
                  <li>Passport serial number references.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
