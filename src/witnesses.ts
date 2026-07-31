import { Ledger } from "../contracts/managed/kyc_check/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type KYCPrivateState = {
  readonly secretKey: Uint8Array;
  readonly country: Uint8Array;
  readonly kycSignature: Uint8Array;
};

export const createKYCPrivateState = (secretKey: Uint8Array, country: Uint8Array, kycSignature: Uint8Array) => ({
  secretKey,
  country,
  kycSignature
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, KYCPrivateState>): [
    KYCPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],

  country: ({
    privateState,
  }: WitnessContext<Ledger, KYCPrivateState>): [
    KYCPrivateState,
    Uint8Array,
  ] => [privateState, privateState.country],

  kycSignature: ({
    privateState,
  }: WitnessContext<Ledger, KYCPrivateState>): [
    KYCPrivateState,
    Uint8Array,
  ] => [privateState, privateState.kycSignature],
};
