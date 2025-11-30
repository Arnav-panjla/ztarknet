const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("RelaySystem", function () {
    
    // Sample Zcash block header data (mock for testing)
    // In production, use real Zcash block headers
    const GENESIS_HASH = "0x00040fe8ec8471911baa1db1266ea15dd06b4a8a5c453883c000b031973dce08";
    const GENESIS_HEIGHT = 2000000; // Starting from a recent height
    
    async function deployFixture() {
        const [owner, relayer, user] = await ethers.getSigners();
        
        const RelaySystem = await ethers.getContractFactory("RelaySystem");
        const relay = await RelaySystem.deploy(GENESIS_HASH, GENESIS_HEIGHT);
        await relay.deployed();
        
        return { relay, owner, relayer, user };
    }
    
    describe("Deployment", function () {
        it("Should set the correct genesis block", async function () {
            const { relay } = await loadFixture(deployFixture);
            
            expect(await relay.genesisHash()).to.equal(GENESIS_HASH);
            expect(await relay.chainTipHeight()).to.equal(GENESIS_HEIGHT);
        });
        
        it("Should set owner as relayer", async function () {
            const { relay, owner } = await loadFixture(deployFixture);
            
            expect(await relay.isRelayer(owner.address)).to.equal(true);
        });
        
        it("Should store genesis header", async function () {
            const { relay } = await loadFixture(deployFixture);
            
            const header = await relay.getHeader(GENESIS_HASH);
            expect(header.height).to.equal(GENESIS_HEIGHT);
            expect(header.verified).to.equal(true);
        });
    });
    
    describe("Relayer Management", function () {
        it("Should allow owner to add relayers", async function () {
            const { relay, owner, relayer } = await loadFixture(deployFixture);
            
            await relay.connect(owner).addRelayer(relayer.address);
            expect(await relay.isRelayer(relayer.address)).to.equal(true);
        });
        
        it("Should allow owner to remove relayers", async function () {
            const { relay, owner, relayer } = await loadFixture(deployFixture);
            
            await relay.connect(owner).addRelayer(relayer.address);
            await relay.connect(owner).removeRelayer(relayer.address);
            expect(await relay.isRelayer(relayer.address)).to.equal(false);
        });
        
        it("Should reject non-owner relayer management", async function () {
            const { relay, user, relayer } = await loadFixture(deployFixture);
            
            await expect(
                relay.connect(user).addRelayer(relayer.address)
            ).to.be.revertedWith("RelaySystem: not owner");
        });
    });
    
    describe("Block Header Submission", function () {
        
        // Create a mock header that links to genesis
        function createMockHeader(prevHash, saplingRoot) {
            // Simplified mock header (not a real Zcash header)
            // Structure: version(4) + prevHash(32) + merkleRoot(32) + saplingRoot(32) + 
            //            timestamp(4) + bits(4) + nonce(32) = 140 bytes minimum
            
            const version = "01000000"; // 4 bytes LE
            const prevBlock = prevHash.slice(2); // Remove 0x
            const merkleRoot = "0000000000000000000000000000000000000000000000000000000000000001";
            const sapRoot = saplingRoot.slice(2);
            const timestamp = "00000000"; // 4 bytes LE
            const bits = "1d00ffff"; // 4 bytes LE (difficulty)
            const nonce = "0000000000000000000000000000000000000000000000000000000000000000";
            
            return "0x" + version + prevBlock + merkleRoot + sapRoot + timestamp + bits + nonce;
        }
        
        it("Should accept valid block header from relayer", async function () {
            const { relay, owner } = await loadFixture(deployFixture);
            
            const saplingRoot = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
            const mockHeader = createMockHeader(GENESIS_HASH, saplingRoot);
            
            const tx = await relay.connect(owner).submitBlockHeader(
                mockHeader,
                GENESIS_HEIGHT + 1
            );
            
            await expect(tx).to.emit(relay, "BlockHeaderSubmitted");
        });
        
        it("Should reject header from non-relayer", async function () {
            const { relay, user } = await loadFixture(deployFixture);
            
            const saplingRoot = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
            const mockHeader = createMockHeader(GENESIS_HASH, saplingRoot);
            
            await expect(
                relay.connect(user).submitBlockHeader(mockHeader, GENESIS_HEIGHT + 1)
            ).to.be.revertedWith("RelaySystem: not relayer");
        });
        
        it("Should reject header with invalid height", async function () {
            const { relay, owner } = await loadFixture(deployFixture);
            
            const saplingRoot = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
            const mockHeader = createMockHeader(GENESIS_HASH, saplingRoot);
            
            await expect(
                relay.connect(owner).submitBlockHeader(mockHeader, GENESIS_HEIGHT + 5) // Wrong height
            ).to.be.revertedWith("RelaySystem: invalid height");
        });
        
        it("Should reject header with unknown previous block", async function () {
            const { relay, owner } = await loadFixture(deployFixture);
            
            const unknownPrev = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
            const saplingRoot = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
            const mockHeader = createMockHeader(unknownPrev, saplingRoot);
            
            await expect(
                relay.connect(owner).submitBlockHeader(mockHeader, GENESIS_HEIGHT + 1)
            ).to.be.revertedWith("RelaySystem: prev block not verified");
        });
    });
    
    describe("Block Confirmation", function () {
        
        function createMockHeader(prevHash, saplingRoot) {
            const version = "01000000";
            const prevBlock = prevHash.slice(2);
            const merkleRoot = "0000000000000000000000000000000000000000000000000000000000000001";
            const sapRoot = saplingRoot.slice(2);
            const timestamp = "00000000";
            const bits = "1d00ffff";
            const nonce = "0000000000000000000000000000000000000000000000000000000000000000";
            
            return "0x" + version + prevBlock + merkleRoot + sapRoot + timestamp + bits + nonce;
        }
        
        it("Should correctly track confirmations", async function () {
            const { relay, owner } = await loadFixture(deployFixture);
            
            // Genesis should not be confirmed initially (needs 6 blocks on top)
            expect(await relay.isConfirmed(GENESIS_HASH)).to.equal(false);
            
            // Submit 6 more blocks
            let prevHash = GENESIS_HASH;
            const blockHashes = [];
            
            for (let i = 1; i <= 6; i++) {
                const saplingRoot = ethers.utils.hexZeroPad(ethers.utils.hexlify(i), 32);
                const header = createMockHeader(prevHash, saplingRoot);
                
                const tx = await relay.connect(owner).submitBlockHeader(
                    header,
                    GENESIS_HEIGHT + i
                );
                
                // Get the new block hash from the event
                const receipt = await tx.wait();
                const event = receipt.events.find(e => e.event === "BlockHeaderSubmitted");
                prevHash = event.args.blockHash;
                blockHashes.push(prevHash);
            }
            
            // Now genesis should be confirmed (6 blocks on top)
            expect(await relay.isConfirmed(GENESIS_HASH)).to.equal(true);
            
            // But the last block should not be confirmed yet
            expect(await relay.isConfirmed(blockHashes[5])).to.equal(false);
        });
    });
    
    describe("Sapling Root Retrieval", function () {
        
        function createMockHeader(prevHash, saplingRoot) {
            const version = "01000000";
            const prevBlock = prevHash.slice(2);
            const merkleRoot = "0000000000000000000000000000000000000000000000000000000000000001";
            const sapRoot = saplingRoot.slice(2);
            const timestamp = "00000000";
            const bits = "1d00ffff";
            const nonce = "0000000000000000000000000000000000000000000000000000000000000000";
            
            return "0x" + version + prevBlock + merkleRoot + sapRoot + timestamp + bits + nonce;
        }
        
        it("Should return Sapling root for confirmed block", async function () {
            const { relay, owner } = await loadFixture(deployFixture);
            
            // Submit 7 blocks (genesis + 6 more to confirm first block after genesis)
            let prevHash = GENESIS_HASH;
            let targetBlockHash;
            const targetSaplingRoot = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
            
            for (let i = 1; i <= 7; i++) {
                let saplingRoot;
                if (i === 1) {
                    saplingRoot = targetSaplingRoot;
                } else {
                    saplingRoot = ethers.utils.hexZeroPad(ethers.utils.hexlify(i), 32);
                }
                
                const header = createMockHeader(prevHash, saplingRoot);
                const tx = await relay.connect(owner).submitBlockHeader(
                    header,
                    GENESIS_HEIGHT + i
                );
                
                const receipt = await tx.wait();
                const event = receipt.events.find(e => e.event === "BlockHeaderSubmitted");
                
                if (i === 1) {
                    targetBlockHash = event.args.blockHash;
                }
                
                prevHash = event.args.blockHash;
            }
            
            // First block after genesis should now be confirmed
            expect(await relay.isConfirmed(targetBlockHash)).to.equal(true);
            
            // Should be able to retrieve its Sapling root
            const retrievedRoot = await relay.getSaplingRoot(targetBlockHash);
            expect(retrievedRoot).to.equal(targetSaplingRoot);
        });
        
        it("Should reject Sapling root query for unconfirmed block", async function () {
            const { relay, owner } = await loadFixture(deployFixture);
            
            const saplingRoot = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
            const header = createMockHeader(GENESIS_HASH, saplingRoot);
            
            const tx = await relay.connect(owner).submitBlockHeader(
                header,
                GENESIS_HEIGHT + 1
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === "BlockHeaderSubmitted");
            const blockHash = event.args.blockHash;
            
            // Block is not confirmed yet (needs 6 more blocks)
            await expect(
                relay.getSaplingRoot(blockHash)
            ).to.be.revertedWith("RelaySystem: block not confirmed");
        });
    });
    
    describe("View Functions", function () {
        it("Should return chain tip correctly", async function () {
            const { relay } = await loadFixture(deployFixture);
            
            const [tipHash, tipHeight] = await relay.getChainTip();
            expect(tipHash).to.equal(GENESIS_HASH);
            expect(tipHeight).to.equal(GENESIS_HEIGHT);
        });
        
        it("Should return block hash by height", async function () {
            const { relay } = await loadFixture(deployFixture);
            
            const blockHash = await relay.getBlockHash(GENESIS_HEIGHT);
            expect(blockHash).to.equal(GENESIS_HASH);
        });
    });
});
