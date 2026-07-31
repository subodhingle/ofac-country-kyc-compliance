# Verification checklist

The executable simulator-backed Compact suite is `src/test/kyc.test.ts`.

```bash
npm test
npm run compile
npm run build
```

Five contract scenarios are verified:

1. initializes the administrator key correctly;
2. permits the administrator to register a trusted KYC provider;
3. accepts a trusted credential for a country outside the prohibited set;
4. rejects a credential for a prohibited country;
5. rejects a credential from an untrusted provider.

The tests exercise generated contract code through `KYCSimulator`, including positive and negative privacy-policy paths. Contract CI compiles the Compact source and runs these tests. Frontend CI independently type-checks and bundles the browser application.
