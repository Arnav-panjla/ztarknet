# ZCLAIM: Privacy-Preserving Zcash Bridge to Ethereum/Starknet

A trustless cross-chain bridge enabling private transfers from Zcash to Ethereum (or Starknet) while preserving Zcash's anonymity guarantees.

Based on the [ZCLAIM Protocol](./research/ZCLAIM_PROTOCOL.md) from the ETH Zürich thesis "Confidential Cross-Blockchain Exchanges" by Aleixo Sánchez.

---

## 🎯 Project Goal

Build the **first privacy-preserving cross-chain bridge** that:
- Locks shielded ZEC on Zcash → Mints wZEC (wrapped ZEC) on Ethereum/Starknet
- Burns wZEC on Ethereum/Starknet → Releases shielded ZEC on Zcash
- **No single party learns the transferred amounts**

---

## 📋 Implementation Roadmap

### Phase 1: Core Infrastructure ✅ (Completed)
- [x] BLAKE2b circuit (for Zcash PoW verification)
- [x] SHA256d circuit (for Merkle trees)
- [x] Merkle tree verification circuit
- [x] Zcash transaction hash verification (ZIP-244)
- [x] Basic Groth16 verifier contract
- [x] Mock token & bridge contracts

### Phase 2: Relay System 🔄 (In Progress)
- [ ] Zcash block header verification
- [ ] Equihash PoW validation
- [ ] Block header storage contract
- [ ] `hashFinalSaplingRoot` extraction
- [ ] Note commitment Merkle path verification

### Phase 3: Vault System
- [ ] Vault registry contract
- [ ] Collateral management (lock/unlock ICN)
- [ ] Homomorphic balance commitments
- [ ] Proof of Balance (POB) verification
- [ ] Proof of Capacity (POC) verification
- [ ] Proof of Insolvency (POI) verification

### Phase 4: Sapling Cryptography Circuits
- [ ] Jubjub curve arithmetic
- [ ] Pedersen value commitments
- [ ] Note commitment (BLAKE2s + Jubjub)
- [ ] Nullifier derivation
- [ ] Key agreement (for encrypted notes)

### Phase 5: ZCLAIM Transfer Types
- [ ] **Mint Transfer** circuit (πZKMint)
  - Prove note locked to vault
  - Prove correct fee deduction
  - Prove rcm derived from permit nonce
- [ ] **Burn Transfer** circuit (πZKBurn)
  - Prove burn amount matches release amount
  - Prove requested note commitment integrity

### Phase 6: Protocol Logic
- [ ] `requestLock()` - Issue lock permit
- [ ] `mint()` - Submit mint transaction (pending)
- [ ] `confirmIssue()` - Vault confirms note receipt
- [ ] `challengeIssue()` - Dispute bad encryption
- [ ] `burn()` - Submit burn transaction (pending)
- [ ] `confirmRedeem()` - Vault proves note release
- [ ] `challengeRedeem()` - Dispute bad encryption

### Phase 7: Privacy Enhancement
- [ ] Splitting strategy (base-2 denominations)
- [ ] Multi-vault transaction routing
- [ ] Randomized shielded addresses

### Phase 8: CLI Tools
- [ ] `zclaim-cli` command-line interface
- [ ] Vault management commands
- [ ] Issue/Redeem transaction commands
- [ ] Proof generation utilities
- [ ] Wallet integration scripts

> **Note:** This project focuses on the **terminal/CLI version only**. No UI/UX frontend is planned for the initial implementation.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ZCLAIM BRIDGE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐  │
│  │   ZCASH     │         │    RELAY         │         │  ETHEREUM/      │  │
│  │  (Backing)  │◄───────►│    SYSTEM        │◄───────►│  STARKNET       │  │
│  │             │         │                  │         │  (Issuing)      │  │
│  └─────────────┘         └──────────────────┘         └─────────────────┘  │
│        │                        │                            │              │
│        │                        │                            │              │
│        ▼                        ▼                            ▼              │
│  ┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐  │
│  │  Shielded   │         │  Block Headers   │         │  Vault Registry │  │
│  │  Notes      │         │  + Sapling Roots │         │  + wZEC Token   │  │
│  └─────────────┘         └──────────────────┘         └─────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
ztarknet/
├── circom/                          # Zero-knowledge circuits
│   ├── circuits/
│   │   ├── blake2b.circom          # ✅ BLAKE2b-256 hash
│   │   ├── sha256d.circom          # ✅ Double SHA256
│   │   ├── merkle_tree.circom      # ✅ Merkle proof verification
│   │   ├── zcash_tx.circom         # ✅ ZIP-244 tx hash
│   │   ├── example.circom          # ✅ Combined verification
│   │   ├── jubjub/                 # 🔲 Jubjub curve operations
│   │   │   ├── curve.circom
│   │   │   ├── pedersen.circom
│   │   │   └── note_commit.circom
│   │   ├── sapling/                # 🔲 Sapling circuits
│   │   │   ├── value_commit.circom
│   │   │   ├── nullifier.circom
│   │   │   └── key_agreement.circom
│   │   └── zclaim/                 # 🔲 ZCLAIM-specific circuits
│   │       ├── mint_proof.circom
│   │       ├── burn_proof.circom
│   │       ├── balance_proof.circom
│   │       └── capacity_proof.circom
│   ├── preprocessing_scripts/       # Circuit compilation & setup
│   ├── production_scripts/          # Proof generation & verification
│   └── tests/
│
├── solidity/                        # Ethereum smart contracts
│   ├── contracts/
│   │   ├── Verifier.sol            # ✅ Groth16 verifier
│   │   ├── Example.sol             # ✅ Basic bridge (to be replaced)
│   │   ├── MockBridge.sol          # ✅ Mock relay
│   │   ├── MockToken.sol           # ✅ wZEC token
│   │   ├── core/                   # 🔲 Core ZCLAIM contracts
│   │   │   ├── ZclaimBridge.sol
│   │   │   ├── VaultRegistry.sol
│   │   │   ├── RelaySystem.sol
│   │   │   └── ExchangeOracle.sol
│   │   └── transfers/              # 🔲 Transfer handlers
│   │       ├── MintHandler.sol
│   │       └── BurnHandler.sol
│   ├── scripts/
│   └── test/
│
├── cairo/                           # 🔲 Starknet contracts (future)
│
├── research/                        # Protocol documentation
│   ├── ZCLAIM_PROTOCOL.md          # ✅ Full protocol spec
│   ├── ZCASH_EXPLAINED.md          # ✅ Zcash fundamentals
│   ├── xclaim.txt                  # ✅ Original XCLAIM paper
│   └── confidential_exchanges.txt  # ✅ Full thesis
│
├── util/                            # Helper scripts
│   ├── hasher.py
│   └── bitcoin_check.py
│
└── data/                            # Test data
    ├── block20230423.tsv
    └── tx20230423.tsv
```

---

## 🔧 Technical Requirements

### Cryptographic Primitives

| Primitive | Purpose | Implementation |
|:----------|:--------|:---------------|
| **BLAKE2b-256** | Zcash PoW, personalized hashes | `circom/circuits/blake2b.circom` ✅ |
| **BLAKE2s-256** | Note commitments | 🔲 TODO |
| **SHA256d** | Merkle trees | `circom/circuits/sha256d.circom` ✅ |
| **Jubjub Curve** | Sapling EC operations | 🔲 TODO |
| **Pedersen Hash** | Value/note commitments | 🔲 TODO |
| **BLS12-381** | zk-SNARK pairing | 🔲 TODO (need for full Sapling) |
| **Groth16** | Proof system | `solidity/contracts/Verifier.sol` ✅ |

### Blockchain Requirements

**Issuing Chain (Ethereum/Starknet) must support:**
- [x] Smart contracts
- [x] BN254 pairing (Ethereum precompile)
- [ ] BLS12-381 pairing (EIP-2537, or Cairo native)
- [ ] BLAKE2b verification
- [ ] Jubjub curve operations

---

## 📚 Resources

### Protocol Documentation
- [ZCLAIM Protocol Specification](./research/ZCLAIM_PROTOCOL.md)
- [Zcash Explained](./research/ZCASH_EXPLAINED.md)
- [Original Thesis](./research/confidential_exchanges.txt)
- [XCLAIM Paper](./research/xclaim.txt)

### External References
- [Zcash Protocol Spec (Sapling)](https://zips.z.cash/protocol/protocol.pdf)
- [ZIP-244: Transaction Identifier](https://zips.z.cash/zip-0244)
- [Jubjub Curve Spec](https://z.cash/technology/jubjub/)
- [BLS12-381 for Ethereum (EIP-2537)](https://eips.ethereum.org/EIPS/eip-2537)

### Libraries & Tools
- [circom](https://docs.circom.io/) - Circuit compiler
- [snarkjs](https://github.com/iden3/snarkjs) - Groth16 prover/verifier
- [circomlib](https://github.com/iden3/circomlib) - Circuit primitives
- [hardhat](https://hardhat.org/) - Ethereum development

---

## 🚀 Quick Start

### Prerequisites
```bash
# Install Node.js dependencies
npm install

# Install circom (Rust)
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
git clone https://github.com/iden3/circom.git
cd circom && cargo build --release
```

### Run Tests
```bash
# Solidity tests
cd solidity && npx hardhat test

# Compile circuits
cd circom && ./preprocessing_scripts/1_compile_circom.sh
```

---

## 🔐 Security Considerations

1. **Vault Collateralization**: Vaults must maintain `σstd ≥ 1.5` collateral ratio
2. **Challenge Periods**: Users have `∆confirmIssue` time to dispute
3. **Splitting Strategy**: Use base-2 denominations to hide total amounts from vaults
4. **Relay Security**: Require `k ≥ 6` block confirmations

---

## 📄 License

ISC

---

## 🤝 Contributing

1. Pick an item from the roadmap
2. Create a feature branch
3. Implement with tests
4. Submit PR

---

## 📞 Contact

- Repository: [github.com/Arnav-panjla/ztarknet](https://github.com/Arnav-panjla/ztarknet)