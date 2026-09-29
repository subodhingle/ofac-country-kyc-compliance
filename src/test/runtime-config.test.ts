import { describe, expect, it } from 'vitest';
import { verifyComplianceDeployment, validateComplianceDeploymentRuntime } from '../runtimeConfig';

const deployment = {
  contractName: 'kyc_check',
  contractAddress: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  network: 'preview',
  transactionHash: '000000000000000000000000000000000000000000000000000000000000000000',
  deployedAt: '2026-08-03T18:00:00.000Z',
};

describe('OFAC Country KYC Compliance production configuration', () => {
  it('accepts matching Preview deployment evidence', () => {
    expect(verifyComplianceDeployment(deployment).contractName).toBe('kyc_check');
  });

  it('rejects evidence copied from another project', () => {
    expect(() => verifyComplianceDeployment({ ...deployment, contractName: 'foreign_contract' })).toThrow(/different contract/);
  });

  it('rejects malformed contract and transaction identifiers', () => {
    expect(() => verifyComplianceDeployment({ ...deployment, contractAddress: 'preview1bad' })).toThrow(/32-byte/);
    expect(() => verifyComplianceDeployment({ ...deployment, transactionHash: 'pending' })).toThrow(/transaction evidence/);
  });

  it('prevents demo mode and network drift in production', () => {
    expect(validateComplianceDeploymentRuntime({ networkId: 'preprod' }).networkId).toBe('preprod');
    expect(() => validateComplianceDeploymentRuntime({ production: true, demoMode: 'true' })).toThrow(/forbidden/);
  });
});
