import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  country(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  kycSignature(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  registerKYCProvider(context: __compactRuntime.CircuitContext<PS>,
                      provider_pk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerProhibitedCountry(context: __compactRuntime.CircuitContext<PS>,
                            country_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyKYC(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
}

export type ProvableCircuits<PS> = {
  registerKYCProvider(context: __compactRuntime.CircuitContext<PS>,
                      provider_pk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerProhibitedCountry(context: __compactRuntime.CircuitContext<PS>,
                            country_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyKYC(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
}

export type PureCircuits = {
  verifyCredential(cntry_0: Uint8Array, sig_0: Uint8Array): Uint8Array;
  publicKey(sk_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  registerKYCProvider(context: __compactRuntime.CircuitContext<PS>,
                      provider_pk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerProhibitedCountry(context: __compactRuntime.CircuitContext<PS>,
                            country_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyKYC(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
  verifyCredential(context: __compactRuntime.CircuitContext<PS>,
                   cntry_0: Uint8Array,
                   sig_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  publicKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  prohibited_countries: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  trusted_kyc_providers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  readonly admin: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               admin_pk_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
