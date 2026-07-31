# CI/CD automation

This repository keeps frontend and smart-contract verification separate:

- `frontend-ci.yml` installs from the lockfile and produces the Vite production bundle.
- `contract-ci.yml` installs the pinned Compact `0.30.0` compiler, compiles `kyc_check.compact`, and runs the five contract tests.
- `dependency-audit.yml` creates a weekly npm audit artifact.
- `release.yml` compiles, tests, builds, and packages frontend and generated contract artifacts for semantic-version tags.

Midnight Preprod deployment remains a manual, wallet-authorized operation because it needs funded DUST, a synchronized wallet, and a configured proof server. Recovery phrases, wallet stores, and private witnesses must never be committed or added to GitHub secrets.
