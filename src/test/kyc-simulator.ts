import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
} from "../../contracts/managed/kyc_check/contract/index.js";
import { type KYCPrivateState, witnesses } from "../witnesses.js";

export class KYCSimulator {
  readonly contract: Contract<KYCPrivateState>;
  circuitContext: CircuitContext<KYCPrivateState>;

  constructor(secretKey: Uint8Array, country: Uint8Array, kycSignature: Uint8Array, adminPk: Uint8Array) {
    this.contract = new Contract<KYCPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext({ secretKey, country, kycSignature }, "0".repeat(64)),
      adminPk
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  public switchUser(secretKey: Uint8Array, country: Uint8Array, kycSignature: Uint8Array) {
    this.circuitContext.currentPrivateState = {
      secretKey,
      country,
      kycSignature
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): KYCPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public registerKYCProvider(providerPk: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.registerKYCProvider(
      this.circuitContext,
      providerPk,
    ).context;
    return this.getLedger();
  }

  public registerProhibitedCountry(countryHash: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.registerProhibitedCountry(
      this.circuitContext,
      countryHash,
    ).context;
    return this.getLedger();
  }

  public verifyKYC(): boolean {
    const result = this.contract.circuits.verifyKYC(
      this.circuitContext,
    );
    return result.result;
  }

  public publicKey(sk: Uint8Array): Uint8Array {
    return this.contract.circuits.publicKey(
      this.circuitContext,
      sk,
    ).result;
  }
}
