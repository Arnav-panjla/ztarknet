# ZCLAIM: Privacy-Preserving Zcash Bridge to Starknet

A trustless cross-chain bridge enabling private transfers from Zcash to Starknet while preserving Zcash's anonymity guarantees.

Based on the [ZCLAIM Protocol](./research/ZCLAIM_PROTOCOL.md) from the ETH Zürich thesis "Confidential Cross-Blockchain Exchanges" by Aleixo Sánchez.

---

## 🎯 Project Goal

Build the **first privacy-preserving cross-chain bridge** that:
- Locks shielded ZEC on Zcash → Mints wZEC (wrapped ZEC) on Starknet
- Burns wZEC on Starknet → Releases shielded ZEC on Zcash
- **No single party learns the transferred amounts**

### Why Starknet?

| Feature | Ethereum | Starknet |
|:--------|:---------|:---------|
| **ZK-Native** | No (EVM) | Yes (Cairo) |
| **Complex Crypto** | Gas prohibitive | Feasible |
| **BLAKE2b/Equihash** | Very expensive | Native support possible |
| **Proof Verification** | Groth16 only | STARK native |
| **Scalability** | Limited | L2 scaling |

---

## 📋 Implementation Roadmap

### Phase 1: Core Infrastructure ✅ (Completed)
- [x] BLAKE2b circuit (for Zcash PoW verification)
- [x] SHA256d circuit (for Merkle trees)
- [x] Merkle tree verification circuit
- [x] Zcash transaction hash verification (ZIP-244)

### Phase 2: Starknet Setup 🔄 (In Progress)
- [ ] Cairo project initialization (Scarb)
- [ ] wZEC token contract (ERC20-like)
- [ ] Basic contract structure

### Phase 3: Relay System (Cairo)
- [ ] Zcash block header storage
- [ ] Block header parsing
- [ ] `hashFinalSaplingRoot` extraction
- [ ] Chain tip tracking
- [ ] Confirmation depth checking

### Phase 4: Vault System (Cairo)
- [ ] Vault registry contract
- [ ] Collateral management (lock/unlock STRK)
- [ ] Vault state tracking
- [ ] Balance commitment storage

### Phase 5: Cryptographic Primitives (Cairo)
- [ ] BLAKE2b-256 implementation
- [ ] BLAKE2s-256 implementation
- [ ] Pedersen hash (Starknet native)
- [ ] Merkle proof verification
- [ ] Value commitments

### Phase 6: ZCLAIM Core Logic (Cairo)
- [ ] `request_lock()` - Issue lock permit
- [ ] `mint()` - Submit mint transaction
- [ ] `confirm_issue()` - Vault confirms note receipt
- [ ] `challenge_issue()` - Dispute bad encryption
- [ ] `burn()` - Submit burn transaction
- [ ] `confirm_redeem()` - Vault proves note release
- [ ] `challenge_redeem()` - Dispute bad encryption

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
│                         ZCLAIM BRIDGE (Starknet)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐  │
│  │   ZCASH     │         │    RELAY         │         │   STARKNET      │  │
│  │  (Backing)  │◄───────►│    SYSTEM        │◄───────►│   (Issuing)     │  │
│  │             │         │    (Cairo)       │         │                 │  │
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
├── cairo/                           # Starknet contracts (Cairo)
│   ├── Scarb.toml                  # Cairo package manager config
│   ├── src/
│   │   ├── lib.cairo               # Main library
│   │   ├── token/
│   │   │   └── wzec.cairo          # wZEC ERC20 token
│   │   ├── relay/
│   │   │   ├── relay_system.cairo  # Block header relay
│   │   │   └── types.cairo         # Relay data types
│   │   ├── vault/
│   │   │   ├── registry.cairo      # Vault registry
│   │   │   └── types.cairo         # Vault data types
│   │   ├── bridge/
│   │   │   ├── zclaim.cairo        # Main bridge logic
│   │   │   ├── mint.cairo          # Mint transfer handler
│   │   │   └── burn.cairo          # Burn transfer handler
│   │   └── crypto/
│   │       ├── blake2b.cairo       # BLAKE2b hash
│   │       ├── blake2s.cairo       # BLAKE2s hash
│   │       └── merkle.cairo        # Merkle proofs
│   └── tests/
│
├── circom/                          # Zero-knowledge circuits (for off-chain proofs)
│   ├── circuits/
│   │   ├── blake2b.circom          # ✅ BLAKE2b-256 hash
│   │   ├── sha256d.circom          # ✅ Double SHA256
│   │   ├── merkle_tree.circom      # ✅ Merkle proof verification
│   │   ├── zcash_tx.circom         # ✅ ZIP-244 tx hash
│   │   └── zclaim/                 # 🔲 ZCLAIM-specific circuits
│   │       ├── mint_proof.circom
│   │       └── burn_proof.circom
│   ├── preprocessing_scripts/
│   ├── production_scripts/
│   └── tests/
│
├── cli/                             # 🔲 Command-line interface
│   ├── src/
│   └── Cargo.toml
│
├── research/                        # Protocol documentation
│   ├── ZCLAIM_PROTOCOL.md          # ✅ Full protocol spec
│   ├── ZCASH_EXPLAINED.md          # ✅ Zcash fundamentals
│   └── ...
│
├── solidity/                        # Legacy Ethereum contracts (reference)
│
└── util/                            # Helper scripts
```

---

## 🔧 Technical Stack

### Starknet (Cairo)
- **Language:** Cairo 1.0+
- **Package Manager:** Scarb
- **Testing:** Cairo Test
- **Deployment:** Starkli

### Off-chain Proofs (Circom)
- **Proof System:** Groth16 / PLONK
- **Prover:** snarkjs
- **Verifier:** Generated Cairo contract

### CLI (Rust)
- **Framework:** Clap
- **Starknet SDK:** starknet-rs
- **Zcash SDK:** zcash_client_backend

---

## 🔧 Cryptographic Primitives

| Primitive | Purpose | Implementation |
|:----------|:--------|:---------------|
| **BLAKE2b-256** | Zcash PoW, personalized hashes | Cairo + Circom ✅ |
| **BLAKE2s-256** | Note commitments | Cairo 🔲 |
| **SHA256d** | Merkle trees | Circom ✅ |
| **Pedersen Hash** | Starknet native commitments | Cairo native ✅ |
| **Poseidon Hash** | Efficient ZK hashing | Cairo native ✅ |

---

## 📚 Resources

### Protocol Documentation
- [ZCLAIM Protocol Specification](./research/ZCLAIM_PROTOCOL.md)
- [Zcash Explained](./research/ZCASH_EXPLAINED.md)
- [Original Thesis](./research/confidential_exchanges.txt)
- [XCLAIM Paper](./research/xclaim.txt)

### Starknet & Cairo
- [Cairo Book](https://book.cairo-lang.org/)
- [Starknet Documentation](https://docs.starknet.io/)
- [Scarb Package Manager](https://docs.swmansion.com/scarb/)
- [OpenZeppelin Cairo Contracts](https://github.com/OpenZeppelin/cairo-contracts)
- [Starknet Foundry](https://foundry-rs.github.io/starknet-foundry/)

### Zcash References
- [Zcash Protocol Spec (Sapling)](https://zips.z.cash/protocol/protocol.pdf)
- [ZIP-244: Transaction Identifier](https://zips.z.cash/zip-0244)
- [Jubjub Curve Spec](https://z.cash/technology/jubjub/)

### Libraries & Tools
- [circom](https://docs.circom.io/) - Circuit compiler
- [snarkjs](https://github.com/iden3/snarkjs) - Groth16 prover/verifier
- [starknet-rs](https://github.com/xJonathanLEI/starknet-rs) - Rust SDK

---

## 🚀 Quick Start

### Prerequisites
```bash
# Install Scarb (Cairo package manager)
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh

# Install Starkli (Starknet CLI)
curl https://get.starkli.sh | sh
starkliup

# Install Starknet Foundry (testing)
curl -L https://raw.githubusercontent.com/foundry-rs/starknet-foundry/master/scripts/install.sh | sh
snfoundryup

# Install Node.js dependencies (for circom)
npm install

# Install circom (Rust)
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
git clone https://github.com/iden3/circom.git
cd circom && cargo build --release
```

### Build & Test
```bash
# Build Cairo contracts
cd cairo && scarb build

# Run Cairo tests
scarb test

# Compile circom circuits
cd circom && ./preprocessing_scripts/1_compile_circom.sh
```

### Deploy (Testnet)
```bash
# Set up account
starkli account deploy --network sepolia

# Deploy contracts
cd cairo && scarb run deploy
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