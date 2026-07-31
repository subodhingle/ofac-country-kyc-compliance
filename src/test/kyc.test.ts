import { KYCSimulator } from "./kyc-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";

setNetworkId("undeployed");

describe("Confidential KYC Country Check Smart Contract Tests", () => {
  const adminSecret = randomBytes(32);

  // Setup helper to create a simulator
  const setupSimulator = (userSecret: Uint8Array, country: Uint8Array, kycSig: Uint8Array) => {
    const tempSim = new KYCSimulator(adminSecret, new Uint8Array(32), new Uint8Array(32), new Uint8Array(32));
    const adminPk = tempSim.publicKey(adminSecret);
    return new KYCSimulator(userSecret, country, kycSig, adminPk);
  };

  it("1. Properly initializes contract parameters and admin key", () => {
    const userSecret = randomBytes(32);
    const simulator = setupSimulator(userSecret, randomBytes(32), new Uint8Array(32));
    const ledgerState = simulator.getLedger();

    const tempSim = new KYCSimulator(adminSecret, new Uint8Array(32), new Uint8Array(32), new Uint8Array(32));
    const adminPk = tempSim.publicKey(adminSecret);
    expect(ledgerState.admin).toEqual(adminPk);
  });

  it("2. Lets admin register a trusted KYC provider", () => {
    const userSecret = randomBytes(32);
    const simulator = setupSimulator(userSecret, randomBytes(32), new Uint8Array(32));
    const providerPk = randomBytes(32);

    // Switch to admin to register provider
    simulator.switchUser(adminSecret, new Uint8Array(32), new Uint8Array(32));
    const ledgerState = simulator.registerKYCProvider(providerPk);
    expect(ledgerState.trusted_kyc_providers.member(providerPk)).toEqual(true);
  });

  it("3. Returns true when user country is NOT on prohibited list and signature matches", () => {
    const userSecret = randomBytes(32);
    const providerPk = randomBytes(32);
    const country = randomBytes(32); // E.g., hash("Japan")

    const simulator = setupSimulator(userSecret, country, providerPk);

    // Register provider
    simulator.switchUser(adminSecret, new Uint8Array(32), new Uint8Array(32));
    simulator.registerKYCProvider(providerPk);

    // User runs check
    simulator.switchUser(userSecret, country, providerPk);
    const isValid = simulator.verifyKYC();
    expect(isValid).toEqual(true);
  });

  it("4. Throws when user resides in a prohibited country", () => {
    const userSecret = randomBytes(32);
    const providerPk = randomBytes(32);
    const country = randomBytes(32); // E.g., hash("ProhibitedLand")

    const simulator = setupSimulator(userSecret, country, providerPk);

    // Register provider & prohibited country
    simulator.switchUser(adminSecret, new Uint8Array(32), new Uint8Array(32));
    simulator.registerKYCProvider(providerPk);
    simulator.registerProhibitedCountry(country);

    // User runs check
    simulator.switchUser(userSecret, country, providerPk);
    expect(() => simulator.verifyKYC()).toThrow("failed assert: User resides in a prohibited country");
  });

  it("5. Throws when the credential was signed by an untrusted KYC provider", () => {
    const userSecret = randomBytes(32);
    const untrustedProviderPk = randomBytes(32);
    const country = randomBytes(32);

    const simulator = setupSimulator(userSecret, country, untrustedProviderPk);

    // User runs check without registering provider
    expect(() => simulator.verifyKYC()).toThrow("failed assert: Credential not signed by trusted KYC provider");
  });
});
