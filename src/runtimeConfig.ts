type RuntimeEnvironment = {
  networkId?: string;
  contractAddress?: string;
  faucetUrl?: string;
  demoMode?: string;
  production?: boolean;
};

export type VerifiedDeployment = {
  contractName: 'kyc_check';
  contractAddress: string;
  network: 'preview' | 'preprod';
  transactionHash: string;
  deployedAt: string;
};

const ADDRESS = /^[0-9a-f]{64}$/i;
const TRANSACTION = /^(?:[0-9a-f]{64}|[0-9a-f]{66})$/i;
const PREVIEW_FAUCET = 'https://faucet.preview.midnight.network/';
const PREPROD_FAUCET = 'https://faucet.preprod.midnight.network/';

export function verifyComplianceDeployment(value: unknown): VerifiedDeployment {
  if (!value || typeof value !== 'object') {
    throw new Error('OFAC Country KYC Compliance: deployment evidence is missing.');
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.contractName !== 'kyc_check') {
    throw new Error('OFAC Country KYC Compliance: deployment belongs to a different contract.');
  }
  if (candidate.network !== 'preview' && candidate.network !== 'preprod') {
    throw new Error('OFAC Country KYC Compliance: only the independently deployed Preview contract is accepted.');
  }
  if (typeof candidate.contractAddress !== 'string' || !ADDRESS.test(candidate.contractAddress)) {
    throw new Error('OFAC Country KYC Compliance: contract address is not a 32-byte hexadecimal address.');
  }
  if (typeof candidate.transactionHash !== 'string' || !TRANSACTION.test(candidate.transactionHash)) {
    throw new Error('OFAC Country KYC Compliance: finalized deployment transaction evidence is invalid.');
  }
  if (typeof candidate.deployedAt !== 'string' || Number.isNaN(Date.parse(candidate.deployedAt))) {
    throw new Error('OFAC Country KYC Compliance: deployment timestamp is invalid.');
  }

  return candidate as VerifiedDeployment;
}

export function validateComplianceDeploymentRuntime(env: RuntimeEnvironment) {
  const networkId = env.networkId || 'preprod';
  const faucetUrl = env.faucetUrl || (networkId === 'preprod' ? PREPROD_FAUCET : PREVIEW_FAUCET);

  if (networkId !== 'preview' && networkId !== 'preprod') {
    throw new Error('OFAC Country KYC Compliance: wallet network must be Preview.');
  }
  if (faucetUrl !== (networkId === 'preprod' ? PREPROD_FAUCET : PREVIEW_FAUCET)) {
    throw new Error('OFAC Country KYC Compliance: faucet host is not the approved Preview faucet.');
  }
  if (env.contractAddress && !ADDRESS.test(env.contractAddress)) {
    throw new Error('OFAC Country KYC Compliance: VITE_CONTRACT_ADDRESS is malformed.');
  }
  if (env.production && env.demoMode === 'true') {
    throw new Error('OFAC Country KYC Compliance: simulated chain activity is forbidden in production.');
  }

  return { networkId, faucetUrl, contractAddress: env.contractAddress || null };
}
