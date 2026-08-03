# Product proposal — OFAC Country KYC Compliance

## Problem

Geographic compliance checks routinely collect a passport, address, nationality, and complete identity record even when the service only needs one answer: is this person outside the prohibited-country policy?

## Product

OFAC Country KYC Compliance is a Midnight Preview application for selective-disclosure country screening. An administrator maintains trusted KYC providers and prohibited-country commitments. A user presents a private country credential, and the Compact contract returns a policy result without publishing the country or passport reference.

## Primary users

- Compliance operators who maintain the current provider and country policy.
- Credential providers who issue country attestations.
- Applicants who need to prove eligibility without disclosing unnecessary identity data.
- Auditors who need deployment and policy evidence without access to private witnesses.

## Privacy model

Privacy is the core product feature, not an optional layer.

Public:

- trusted-provider registry;
- prohibited-country commitments;
- contract address, transaction confirmations, and policy result.

Private:

- the applicant's country witness;
- credential witness;
- passport reference and wallet-local secret material.

The proof demonstrates that a trusted provider attested to a country that is not prohibited. It does not publish which allowed country was used.

## User journey

1. Connect a compatible Midnight wallet such as 1AM or Lace.
2. Load the confirmed `kyc_check` Preview deployment.
3. An authorized operator registers a KYC provider and prohibited-country commitments.
4. The applicant supplies wallet-local credential witnesses.
5. The browser requests a zero-knowledge proof and submits the transaction.
6. The cockpit displays the confirmed result and contract identity.

## Success criteria

- At least three executable contract tests pass.
- Frontend and Compact contract checks run independently in CI.
- The deployed Preview address and transaction are discoverable from the repository.
- The application never stores a recovery phrase or raw passport record in Git.
- The README clearly separates public state from private witness data.

## Scope boundary

This is a testnet compliance prototype. Production use would require a legally reviewed policy source, issuer governance, credential revocation, independent security review, and a hardened cryptographic credential format.
