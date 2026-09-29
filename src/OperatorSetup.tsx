import { useRef, useState } from 'react';
import { submitKyccheckCircuit } from './midnightClient';
import { pureCircuits } from '../contracts/managed/kyc_check/contract/index.js';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils';

export function hex32(value: string) {
  const hex = value.trim().replace(/^0x/, '');
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('Enter exactly 64 hexadecimal characters, without labels or backticks.');
  return fromHex(hex);
}
function text32(value: string) {
  const bytes = new TextEncoder().encode(value.trim());
  if (!bytes.length || bytes.length > 32) throw new Error('Enter between 1 and 32 UTF-8 bytes.');
  const result = new Uint8Array(32); result.set(bytes); return result;
}
export function prepareOperatorArgument(value: string, salt: string): string {
  const saltBytes = hex32(salt); const arg = pureCircuits.credentialCommitment(text32(value), saltBytes); return toHex(arg);
}
export default function OperatorSetup({ wallet, address }: { wallet: Parameters<typeof submitKyccheckCircuit>[0] | null; address: string | null }) {
  const [admin, setAdmin] = useState('');
  const [value, setValue] = useState("IN");
  const [salt, setSalt] = useState('');
  const [argument, setArgument] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [ack, setAck] = useState(false);
  const lock = useRef(false);
  async function submit() {
    if (lock.current) return;
    setMessage('');
    try {
      if (!wallet || !address) throw new Error('Connect your wallet and load the existing deployment first.');
      if (!ack) throw new Error('Confirm this administrator change before submitting.');
      const secretKey = hex32(admin);
      const args = [hex32(argument)];
      lock.current = true; setBusy(true);
      const result = await submitKyccheckCircuit(wallet, address, 'issueCredential', args, { secretKey, country: new Uint8Array(32), credentialSalt: new Uint8Array(32) });
      setAdmin(''); setAck(false);
      setMessage('Confirmed issueCredential: ' + result.txId + '. Return to the transaction workspace for the next step.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Administrator transaction failed.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="panel card" aria-label="Country credential issuer">
    <h2>Country credential issuer</h2>
    <p>Use the existing contract administrator credential, not a wallet seed. This does not deploy or change the contract address.</p>
    <p className="address">{address || 'No validated contract loaded.'}</p>
    <details><summary>Prepare credential commitment</summary>
      <p>Use the same value and salt in the verification form after issuance. Only use synthetic test data.</p>
      <label>Country code<input type="text" autoComplete="off" value={value} onChange={e=>{setValue(e.target.value);setArgument('');}} /></label>
      <label>Credential salt (64 hex characters)<input type="password" autoComplete="off" value={salt} onChange={e=>{setSalt(e.target.value);setArgument('');}} /></label>
      <button type="button" disabled={busy} onClick={()=>{try {setArgument(prepareOperatorArgument(value,salt));setMessage('Prepared locally. No transaction submitted.');}catch(e){setMessage(e instanceof Error?e.message:'Invalid input');}}}>Prepare public value</button>
    </details>
    <label>Credential commitment (64 hex characters)<input value={argument} onChange={e=>setArgument(e.target.value)} spellCheck={false}/></label>
    <label>Administrator credential<input type="password" autoComplete="off" value={admin} onChange={e=>setAdmin(e.target.value)} /></label>
    <label><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/> I authorize this registration on the displayed contract.</label>
    <button type="button" disabled={busy || !wallet || !address} onClick={()=>void submit()}>{busy?'Awaiting wallet and chain confirmation…':'Submit issueCredential'}</button>
    {(!wallet || !address) && <p>Connect a wallet and load the deployment to enable this action.</p>}
    <p role="status" style={{overflowWrap:'anywhere'}}>{message}</p>
  </section>;
}

