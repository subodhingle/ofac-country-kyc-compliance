export const contractName = 'kyc_check';
export const target = 50;
const bytes = value => Uint8Array.from(Buffer.from(value, 'hex'));
const padded = value => { const result = new Uint8Array(32); result.set(new TextEncoder().encode(value)); return result; };
export function makePlan(pure, data) {
  const admin = bytes(data.adminSecret);
  const adminPk = pure.publicKey(admin);
  const id = bytes(data.id);
  const actors = data.actors.map((actor, index) => ({ secretKey: bytes(actor.secret), salt: bytes(actor.salt), index }));
  const steps = [];
  const add = (kind, circuit, state, args, verify) => steps.push({kind, circuit, state, args, verify});
  const adminState = {secretKey: admin, country: new Uint8Array(32), credentialSalt: new Uint8Array(32)};
  for (const actor of actors.slice(0, target)) {
    const value = padded('IN');
    const commitment = pure.credentialCommitment(value, actor.salt);
    const state = {secretKey: actor.secretKey, country: value, credentialSalt: actor.salt};
    add('setup', 'issueCredential', adminState, [commitment], live => live.issued_credentials.member(commitment));
    add('demo', 'verifyKYC', state, [], live => live.issued_credentials.member(commitment));
  }
  return {constructorArgs: [adminPk], adminState, steps};
}
export const witnessFields = ["localSecretKey","country","credentialSalt"];
