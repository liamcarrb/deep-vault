# Deep Vault

Deep Vault is an encrypted document vault built on Zama's FHEVM. It lets users publish document metadata and ciphertext
on-chain while keeping the document body and ownership secrets encrypted. The system centers on a locally generated EVM
address that acts as a per-document secret for encrypting and decrypting content without exposing plaintext to the chain.

## Why this exists

Most on-chain document systems either store plaintext or depend on centralized storage and access control. That makes
auditability and privacy hard to reconcile. Deep Vault solves this by keeping the document body encrypted end-to-end while
storing immutable references and ciphertext on-chain.

## What problems it solves

- Prevents on-chain leakage of document contents and secret keys.
- Preserves verifiable history of document updates without revealing plaintext.
- Enables selective sharing with other users through encrypted authorization.
- Provides a consistent, auditable flow for creation, editing, and collaboration.

## How it works

1. Create a document:
   - Generate a random EVM address A locally.
   - Encrypt A with Zama FHE.
   - Submit the document name, an empty body, and encrypted A on-chain.
2. Read and edit:
   - Fetch the document name and encrypted A from the chain.
   - Decrypt A locally.
   - Edit the document body, encrypt it with A, and save the ciphertext on-chain.
3. Share access:
   - The owner can allow an address A for other users.
   - Authorized users can decrypt and submit updates using the same encrypted workflow.

## Key advantages

- Privacy by design: document contents and secrets stay encrypted at all times.
- On-chain integrity: every update is recorded and verifiable.
- Granular sharing: owners can grant access without exposing plaintext.
- Simple collaboration: authorized users can contribute changes securely.

## Tech stack

- Smart contracts: Solidity with Hardhat
- FHE protocol: Zama FHEVM
- Frontend: React + Vite
- Wallets: RainbowKit
- Contract reads: viem
- Contract writes: ethers
- Package manager: npm

## Repository layout

- `contracts`: Solidity smart contracts
- `deploy`: deployment scripts
- `tasks`: Hardhat tasks
- `test`: Hardhat tests
- `docs`: protocol and relayer documentation
- `src`: frontend application (React + Vite)

## Configuration

Deployment uses a private key and Infura API key, loaded with dotenv in the Hardhat config or deploy scripts. Do not use
mnemonic-based deployments.

Required environment variables:

- `PRIVATE_KEY`
- `INFURA_API_KEY`
- `ETHERSCAN_API_KEY` (optional, for verification)

## Usage

Install dependencies:

```bash
npm install
```

Compile and test:

```bash
npm run compile
npm run test
```

Deploy to Sepolia:

```bash
npx hardhat deploy --network sepolia
```

Verify (optional):

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Frontend integration notes

- Contract ABI must be copied from `deployments/sepolia`.
- Do not use Tailwind CSS.
- Do not use local storage or localhost network configurations.
- Do not use frontend environment variables.
- Do not import files from the repository root into the frontend.
- Do not use JSON files in the frontend.
- Do not modify files under `src/hooks`.

## Roadmap

- Add richer document metadata (tags, versions, and editors).
- Introduce encrypted search over document titles and metadata.
- Improve collaborative editing UX with conflict resolution hints.
- Add role-based access controls beyond allow-listing.
- Expand testing coverage for multi-user flows and edge cases.

## License

BSD-3-Clause-Clear. See `LICENSE`.
