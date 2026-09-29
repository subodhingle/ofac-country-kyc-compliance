import { type CircuitContext, QueryContext, sampleContractAddress, createConstructorContext, CostModel } from "@midnight-ntwrk/compact-runtime";
import { Contract, type Ledger, ledger } from "../../contracts/managed/kyc_check/contract/index.js";
import { type KYCPrivateState, witnesses } from "../witnesses.js";

export class KYCSimulator {
  readonly contract: Contract<KYCPrivateState>;
  circuitContext: CircuitContext<KYCPrivateState>;

  constructor(secretKey: Uint8Array, country: Uint8Array, credentialSalt: Uint8Array, adminPk: Uint8Array) {
    this.contract = new Contract<KYCPrivateState>(witnesses);
    const state = this.contract.initialState(
      createConstructorContext({ secretKey, country, credentialSalt }, "0".repeat(64)),
      adminPk,
    );
    this.circuitContext = {
      currentPrivateState: state.currentPrivateState,
      currentZswapLocalState: state.currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(state.currentContractState.data, sampleContractAddress()),
    };
  }

  switchUser(secretKey: Uint8Array, country: Uint8Array, credentialSalt: Uint8Array) {
    this.circuitContext.currentPrivateState = { secretKey, country, credentialSalt };
  }

  getLedger(): Ledger { return ledger(this.circuitContext.currentQueryContext.state); }
  publicKey(sk: Uint8Array) { return this.contract.circuits.publicKey(this.circuitContext, sk).result; }
  credentialCommitment(country: Uint8Array, salt: Uint8Array) { return this.contract.circuits.credentialCommitment(this.circuitContext, country, salt).result; }

  issueCredential(commitment: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.issueCredential(this.circuitContext, commitment).context;
    return this.getLedger();
  }

  registerProhibitedCountry(country: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.registerProhibitedCountry(this.circuitContext, country).context;
    return this.getLedger();
  }

  verifyKYC(): boolean { return this.contract.circuits.verifyKYC(this.circuitContext).result; }
}
