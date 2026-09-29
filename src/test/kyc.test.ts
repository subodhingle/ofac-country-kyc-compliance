import { KYCSimulator } from "./kyc-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, expect, it } from "vitest";
import { randomBytes } from "./utils.js";

setNetworkId("undeployed");

describe("Confidential country credential contract", () => {
  const adminSecret = randomBytes(32);
  const setup = (country: Uint8Array, salt: Uint8Array) => {
    const bootstrap = new KYCSimulator(adminSecret, new Uint8Array(32), new Uint8Array(32), new Uint8Array(32));
    return new KYCSimulator(randomBytes(32), country, salt, bootstrap.publicKey(adminSecret));
  };

  it("anchors the compliance administrator", () => {
    const bootstrap = new KYCSimulator(adminSecret, new Uint8Array(32), new Uint8Array(32), new Uint8Array(32));
    expect(setup(randomBytes(32), randomBytes(32)).getLedger().admin).toEqual(bootstrap.publicKey(adminSecret));
  });

  it("allows only the administrator to issue KYC commitments", () => {
    const country = randomBytes(32);
    const salt = randomBytes(32);
    const sim = setup(country, salt);
    const commitment = sim.credentialCommitment(country, salt);
    expect(() => sim.issueCredential(commitment)).toThrow(/Only admin/);
    sim.switchUser(adminSecret, new Uint8Array(32), new Uint8Array(32));
    expect(sim.issueCredential(commitment).issued_credentials.member(commitment)).toBe(true);
  });

  it("verifies an issued country that is not prohibited", () => {
    const country = randomBytes(32);
    const salt = randomBytes(32);
    const sim = setup(country, salt);
    const commitment = sim.credentialCommitment(country, salt);
    sim.switchUser(adminSecret, new Uint8Array(32), new Uint8Array(32));
    sim.issueCredential(commitment);
    sim.switchUser(randomBytes(32), country, salt);
    expect(sim.verifyKYC()).toBe(true);
  });

  it("rejects an issued prohibited country", () => {
    const country = randomBytes(32);
    const salt = randomBytes(32);
    const sim = setup(country, salt);
    const commitment = sim.credentialCommitment(country, salt);
    sim.switchUser(adminSecret, new Uint8Array(32), new Uint8Array(32));
    sim.issueCredential(commitment);
    sim.registerProhibitedCountry(country);
    sim.switchUser(randomBytes(32), country, salt);
    expect(() => sim.verifyKYC()).toThrow(/prohibited/);
  });

  it("rejects an unissued KYC credential", () => {
    expect(() => setup(randomBytes(32), randomBytes(32)).verifyKYC()).toThrow(/not issued/);
  });
});
