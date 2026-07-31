# Project Idea: Confidential Credentials (KYC Country Check)

A regulatory compliance system that lets users prove they are citizens of a non-sanctioned country without disclosing their name, home address, or passport document number.

## 1. Midnight Network Specialty (ZK & Privacy Features)
*   **Rational Privacy for Compliance:** Helps DApps comply with geographic restriction laws (e.g., OFAC sanctions checks) while protecting users from leaking their complete address or passport details.
*   **Encrypted Witness State:** Passport and country details are stored in the private wallet state. The ZK circuit validates that the country name does not match a public blacklist.
*   **Credential Proofs:** Verifies issuer signatures on passport records without exposing the signature itself.

## 2. Technical Architecture (Compact Contract)
*   **Public State:**
    *   `sanctioned_countries`: Public list of blacklisted country names.
    *   `accredited_issuers`: Public keys of licensed KYC providers.
*   **Private State (User Wallet):**
    *   `user_passport`: A signed KYC document containing:
        *   `document_id`
        *   `country_of_citizenship`
        *   `issuer_signature`: KYC provider's signature.
*   **Circuits (ZK Proofs):**
    *   `verify_citizenship(user_passport, sanctioned_countries)`:
        1. Checks that the `issuer_signature` belongs to an address in `accredited_issuers`.
        2. Compares `user_passport.country_of_citizenship` with the `sanctioned_countries` list.
        3. Asserts that the country is not present in the blacklist.
        *Output:* A compliance proof verifying the user is from an allowed country, without revealing which specific country they are from.

## 3. Frontend & Integration (Level 3 Focus)
*   **User Interface:** A compliance portal. The user imports their KYC credentials, selects a service they want to access, generates the ZK proof of residency eligibility locally, and presents it.
*   **Lace/Midnight Wallet Integration:**
    *   Retrieves private passport credentials.
    *   Generates ZK proof tokens.

## 4. Verification & Testing Plan
*   **Unit Tests:**
    *   Assert that a passport showing citizenship in "Canada" (not on the blacklist) compiles successfully.
    *   Assert that a passport from a blacklisted country fails the ZK validation check.
    *   Verify that the passport ID remains hidden.

---

## 5. How to build and deploy on Midnight

The repository is self-contained. Use the commands and environment template in [README.md](./README.md), the verification matrix in [TESTING.md](./TESTING.md), and the deployment workflow in `deploy.mjs`. Live deployment requires a funded Midnight Preprod wallet, DUST, and a reachable proof server.
