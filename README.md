# ZCLAIM: Privacy-Preserving Zcash Bridge to Starknet

A trustless cross-chain bridge enabling private transfers from Zcash to Starknet while preserving Zcash's anonymity guarantees.

Based on the [ZCLAIM Protocol](./research/ZCLAIM_PROTOCOL.md) from the ETH Zürich thesis "Confidential Cross-Blockchain Exchanges" by Aleixo Sánchez.

---

## Project Goal

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

## Implementation Status

### Phase 1: Core Infrastructure 
- [x] BLAKE2b circuit (for Zcash PoW verification)
- [x] SHA256d circuit (for Merkle trees)
- [x] Merkle tree verification circuit
- [x] Zcash transaction hash verification (ZIP-244)
- [x] ZCLAIM mint/burn proof circuits

### Phase 2: Starknet Contracts 
- [x] Cairo project with Scarb
- [x] wZEC token contract (ERC20)
- [x] Relay system (block header storage)
- [x] Vault registry (collateral management)
- [x] Bridge contracts (zclaim, mint, burn)
- [x] Crypto primitives (blake2b, merkle - placeholders)

> Some Cairo modules need manual review for Cairo 2.8 compatibility

### Phase 3: CLI & Services 
- [x] `zclaim` CLI (relay, issue, redeem, vault, config, status)
- [x] Relay service (Node.js daemon)
- [x] Deployment scripts

### Phase 4: Testing & Deployment 
- [x] Integration test script
- [ ] Unit tests for Cairo contracts
- [ ] End-to-end testing
- [ ] Testnet deployment

> **Note:** This project focuses on the **terminal/CLI version only**. No UI/UX frontend is planned.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ZCLAIM BRIDGE (Starknet)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐  │
│  │   ZCASH     │         │    RELAY         │         │   STARKNET      │  │
│  │  (Backing)  │◄───────►│    SERVICE       │◄───────►│   (Issuing)     │  │
│  │             │         │    (Node.js)     │         │                 │  │
│  └─────────────┘         └──────────────────┘         └─────────────────┘  │
│        │                        │                            │              │
│        ▼                        ▼                            ▼              │
│  ┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐  │
│  │  Shielded   │         │  RelaySystem     │         │  VaultRegistry  │  │
│  │  Notes      │         │  (Cairo)         │         │  + wZEC Token   │  │
│  └─────────────┘         └──────────────────┘         └─────────────────┘  │
│                                  │                            │              │
│                                  └────────────┬───────────────┘              │
│                                               ▼                              │
│                                  ┌──────────────────┐                        │
│                                  │   ZclaimBridge   │                        │
│                                  │   (Cairo)        │                        │
│                                  └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
ztarknet/
├── cairo/                           # Starknet contracts (Cairo 2.8)
│   ├── Scarb.toml                  # Package config
│   ├── src/
│   │   ├── lib.cairo               # Main library
│   │   ├── token/wzec.cairo        #  wZEC ERC20 token
│   │   ├── relay/
│   │   │   ├── relay_system.cairo  #  Block header relay
│   │   │   └── types.cairo         #  Data types
│   │   ├── vault/
│   │   │   ├── registry.cairo      #  Vault registry (needs review)
│   │   │   └── types.cairo         #  Vault types (needs review)
│   │   ├── bridge/
│   │   │   ├── zclaim.cairo        #  Main bridge (needs review)
│   │   │   ├── mint.cairo          #  Issue helpers (needs review)
│   │   │   └── burn.cairo          #  Redeem helpers (needs review)
│   │   └── crypto/
│   │       ├── blake2b.cairo       #  BLAKE2b (placeholder)
│   │       └── merkle.cairo        # Merkle proofs (placeholder)
│   └── scripts/
│       └── deploy.sh               #  Deployment script
│
├── cli/                             #  Command-line interface
│   ├── package.json
│   └── src/
│       ├── index.js                # Main entry point
│       ├── config.js               # Configuration
│       ├── commands/
│       │   ├── relay.js            # Block header relay commands
│       │   ├── issue.js            # ZEC→wZEC commands
│       │   ├── redeem.js           # wZEC→ZEC commands
│       │   ├── vault.js            # Vault operator commands
│       │   ├── config.js           # CLI configuration
│       │   └── status.js           # Status checking
│       └── utils/
│           ├── starknet.js         # Starknet helpers
│           └── zcash.js            # Zcash RPC helpers
│
├── relay-service/                   # Relay daemon
│   ├── package.json
│   └── src/
│       ├── index.js                # Main service
│       ├── zcash-client.js         # Zcash RPC client
│       ├── starknet-relay.js       # Starknet contract client
│       └── header-processor.js     # Header parsing/encoding
│
├── circom/                          #  ZK circuits
│   └── circuits/
│       ├── blake2b.circom          #  BLAKE2b-256
│       ├── sha256d.circom          #  Double SHA256
│       ├── merkle_tree.circom      #  Merkle verification
│       ├── zcash_tx.circom         #  ZIP-244 tx hash
│       ├── zclaim_mint.circom      #  Mint proof circuit
│       └── zclaim_burn.circom      #  Burn proof circuit
│
├── scripts/
│   └── integration_test.sh         #  Integration test runner
│
├── research/                        # Protocol documentation
│   ├── ZCLAIM_PROTOCOL.md          # Full protocol spec
│   └── ZCASH_EXPLAINED.md          # Zcash fundamentals
│
└── solidity/                        # Legacy/reference contracts
```

---

## Quick Start

### Build & Test
```bash
# Run integration tests (builds everything)
./scripts/integration_test.sh

# Or manually:

# Build Cairo contracts
cd cairo && scarb build

# Install CLI
cd cli && npm install

# Install relay service
cd relay-service && npm install
```

### Configure CLI
```bash
cd cli
node src/index.js config init
```

### Deploy to Testnet
```bash
# Set up Starknet account first
starkli account oz init ~/.starkli-wallets/deployer

# Deploy contracts
cd cairo && ./scripts/deploy.sh sepolia
```

### Run Relay Service
```bash
cd relay-service
cp .env.example .env
# Edit .env with your configuration
npm start
```

---

## CLI Usage

```bash
# Main help
zclaim --help

# Check bridge status
zclaim status bridge
zclaim status health

# Issue: ZEC → wZEC
zclaim issue vaults              # List available vaults
zclaim issue request -v 0x... -a 1.5   # Request lock permit
zclaim issue lock <nonce>        # Lock ZEC on Zcash
zclaim issue mint <nonce>        # Claim wZEC on Starknet
zclaim issue status <nonce>      # Check status

# Redeem: wZEC → ZEC
zclaim redeem request -a 1.5 -t zs1...  # Burn wZEC, request release
zclaim redeem status <nonce>     # Check status
zclaim redeem claim <nonce>      # Claim collateral if timeout

# Vault operations (for operators)
zclaim vault register -z zs1... -c 10   # Register vault
zclaim vault deposit 5           # Add collateral
zclaim vault status              # Check vault status
zclaim vault pending             # List pending operations
zclaim vault confirm-issue <nonce>      # Confirm issue
zclaim vault release <nonce>     # Release ZEC for redeem

# Relay operations
zclaim relay status              # Check relay status
zclaim relay submit <height>     # Submit single block
zclaim relay sync -s 100 -e 200  # Sync block range
```

---

## Security Notes

1. **Collateral**: Vaults must maintain ≥150% collateralization
2. **Confirmations**: 20 Zcash block confirmations required
3. **Timeouts**: 24h for issue, 24h for redeem
4. **Challenge**: Vaults can dispute bad encryption proofs

---

## Contributing

1. Review Cairo contracts in `cairo/src/` (some need fixes)
2. Implement proper BLAKE2b in Cairo
3. Add unit tests
4. Submit PR

---

## Contact

- Repository: [github.com/Arnav-panjla/ztarknet](https://github.com/Arnav-panjla/ztarknet)