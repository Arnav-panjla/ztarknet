// SPDX-License-Identifier: MIT
pragma solidity ^0.6.11;
pragma experimental ABIEncoderV2;

/**
 * @title RelaySystem
 * @notice Zcash block header relay for ZCLAIM protocol
 * @dev Stores and verifies Zcash block headers, extracts Sapling commitment tree roots
 * 
 * Zcash Block Header Structure (1487 bytes for Sapling):
 * - version: 4 bytes
 * - hashPrevBlock: 32 bytes  
 * - hashMerkleRoot: 32 bytes
 * - hashFinalSaplingRoot: 32 bytes (CRITICAL for ZCLAIM - Sapling note commitment tree root)
 * - nTime: 4 bytes
 * - nBits: 4 bytes
 * - nNonce: 32 bytes
 * - solutionSize: 3 bytes (CompactSize)
 * - solution: 1344 bytes (Equihash solution)
 */
contract RelaySystem {
    
    // ============ Constants ============
    
    // Minimum confirmations required for a block to be considered final
    uint256 public constant MIN_CONFIRMATIONS = 6;
    
    // Zcash block header component sizes
    uint256 public constant HEADER_VERSION_SIZE = 4;
    uint256 public constant HEADER_PREV_BLOCK_SIZE = 32;
    uint256 public constant HEADER_MERKLE_ROOT_SIZE = 32;
    uint256 public constant HEADER_SAPLING_ROOT_SIZE = 32;
    uint256 public constant HEADER_TIME_SIZE = 4;
    uint256 public constant HEADER_BITS_SIZE = 4;
    uint256 public constant HEADER_NONCE_SIZE = 32;
    
    // Offset to hashFinalSaplingRoot in block header
    uint256 public constant SAPLING_ROOT_OFFSET = 68; // 4 + 32 + 32
    
    // ============ Structs ============
    
    struct BlockHeader {
        bytes32 blockHash;           // BLAKE2b-256 hash of the header
        bytes32 prevBlockHash;       // Hash of previous block
        bytes32 merkleRoot;          // Transaction Merkle root
        bytes32 saplingRoot;         // hashFinalSaplingRoot - Sapling note commitment tree root
        uint32 timestamp;            // Block timestamp
        uint32 bits;                 // Difficulty target (compact form)
        uint256 height;              // Block height
        uint256 chainWork;           // Cumulative chain work
        bool verified;               // Whether PoW has been verified
    }
    
    struct MerkleProof {
        bytes32[] siblings;          // Sibling hashes along the path
        uint256 index;               // Position of leaf in tree (encodes left/right path)
    }
    
    // ============ State Variables ============
    
    // Block hash => Block header data
    mapping(bytes32 => BlockHeader) public headers;
    
    // Block height => Block hash (for the main chain)
    mapping(uint256 => bytes32) public heightToHash;
    
    // Current chain tip
    bytes32 public chainTip;
    uint256 public chainTipHeight;
    
    // Genesis block hash (starting point of relay)
    bytes32 public genesisHash;
    
    // Relayer addresses (authorized to submit headers)
    mapping(address => bool) public isRelayer;
    
    // Owner for admin functions
    address public owner;
    
    // ============ Events ============
    
    event BlockHeaderSubmitted(
        bytes32 indexed blockHash,
        bytes32 indexed prevBlockHash,
        uint256 height,
        bytes32 saplingRoot
    );
    
    event ChainReorg(
        bytes32 indexed oldTip,
        bytes32 indexed newTip,
        uint256 oldHeight,
        uint256 newHeight
    );
    
    event RelayerAdded(address indexed relayer);
    event RelayerRemoved(address indexed relayer);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "RelaySystem: not owner");
        _;
    }
    
    modifier onlyRelayer() {
        require(isRelayer[msg.sender], "RelaySystem: not relayer");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(bytes32 _genesisHash, uint256 _genesisHeight) public {
        owner = msg.sender;
        isRelayer[msg.sender] = true;
        
        genesisHash = _genesisHash;
        chainTip = _genesisHash;
        chainTipHeight = _genesisHeight;
        
        // Initialize genesis header (minimal - no full verification)
        headers[_genesisHash] = BlockHeader({
            blockHash: _genesisHash,
            prevBlockHash: bytes32(0),
            merkleRoot: bytes32(0),
            saplingRoot: bytes32(0),
            timestamp: 0,
            bits: 0,
            height: _genesisHeight,
            chainWork: 0,
            verified: true
        });
        
        heightToHash[_genesisHeight] = _genesisHash;
    }
    
    // ============ Admin Functions ============
    
    function addRelayer(address _relayer) external onlyOwner {
        isRelayer[_relayer] = true;
        emit RelayerAdded(_relayer);
    }
    
    function removeRelayer(address _relayer) external onlyOwner {
        isRelayer[_relayer] = false;
        emit RelayerRemoved(_relayer);
    }
    
    // ============ Core Relay Functions ============
    
    /**
     * @notice Submit a new Zcash block header
     * @param _headerBytes Raw block header bytes
     * @param _height Expected block height
     * @return blockHash The hash of the submitted block
     */
    function submitBlockHeader(
        bytes calldata _headerBytes,
        uint256 _height
    ) external onlyRelayer returns (bytes32 blockHash) {
        // Parse header components
        (
            bytes32 prevBlockHash,
            bytes32 merkleRoot,
            bytes32 saplingRoot,
            uint32 timestamp,
            uint32 bits
        ) = parseHeader(_headerBytes);
        
        // Verify previous block exists and is on our chain
        require(headers[prevBlockHash].verified, "RelaySystem: prev block not verified");
        require(headers[prevBlockHash].height == _height - 1, "RelaySystem: invalid height");
        
        // Compute block hash (BLAKE2b-256 of header)
        // Note: In production, this should call a BLAKE2b precompile or library
        blockHash = computeBlockHash(_headerBytes);
        
        // Ensure block hasn't been submitted
        require(!headers[blockHash].verified, "RelaySystem: block already exists");
        
        // TODO: Verify Equihash PoW solution
        // For now, we trust the relayer (to be replaced with actual verification)
        bool powValid = verifyEquihash(_headerBytes, bits);
        require(powValid, "RelaySystem: invalid PoW");
        
        // Calculate cumulative chain work
        uint256 parentWork = headers[prevBlockHash].chainWork;
        uint256 blockWork = calculateWork(bits);
        uint256 chainWork = parentWork + blockWork;
        
        // Store header
        headers[blockHash] = BlockHeader({
            blockHash: blockHash,
            prevBlockHash: prevBlockHash,
            merkleRoot: merkleRoot,
            saplingRoot: saplingRoot,
            timestamp: timestamp,
            bits: bits,
            height: _height,
            chainWork: chainWork,
            verified: true
        });
        
        // Update chain tip if this extends the heaviest chain
        if (chainWork > headers[chainTip].chainWork) {
            // Check for reorg
            if (prevBlockHash != chainTip) {
                emit ChainReorg(chainTip, blockHash, chainTipHeight, _height);
            }
            
            chainTip = blockHash;
            chainTipHeight = _height;
            heightToHash[_height] = blockHash;
        }
        
        emit BlockHeaderSubmitted(blockHash, prevBlockHash, _height, saplingRoot);
        
        return blockHash;
    }
    
    /**
     * @notice Submit multiple headers at once (for syncing)
     * @param _headers Array of raw header bytes
     * @param _startHeight Starting height for the batch
     */
    function submitBlockHeaderBatch(
        bytes[] calldata _headers,
        uint256 _startHeight
    ) external onlyRelayer {
        for (uint256 i = 0; i < _headers.length; i++) {
            submitBlockHeader(_headers[i], _startHeight + i);
        }
    }
    
    // ============ Verification Functions ============
    
    /**
     * @notice Check if a block has enough confirmations
     * @param _blockHash The block to check
     * @return True if block has MIN_CONFIRMATIONS
     */
    function isConfirmed(bytes32 _blockHash) public view returns (bool) {
        if (!headers[_blockHash].verified) {
            return false;
        }
        uint256 blockHeight = headers[_blockHash].height;
        return chainTipHeight >= blockHeight + MIN_CONFIRMATIONS;
    }
    
    /**
     * @notice Get the Sapling root for a confirmed block
     * @param _blockHash The block hash
     * @return The hashFinalSaplingRoot from that block
     */
    function getSaplingRoot(bytes32 _blockHash) external view returns (bytes32) {
        require(isConfirmed(_blockHash), "RelaySystem: block not confirmed");
        return headers[_blockHash].saplingRoot;
    }
    
    /**
     * @notice Verify a note commitment exists in a block's Sapling tree
     * @param _blockHash The block containing the note
     * @param _noteCommitment The note commitment to verify
     * @param _proof Merkle proof from note to Sapling root
     * @return True if the note commitment is valid
     */
    function verifyNoteCommitment(
        bytes32 _blockHash,
        bytes32 _noteCommitment,
        MerkleProof calldata _proof
    ) external view returns (bool) {
        require(isConfirmed(_blockHash), "RelaySystem: block not confirmed");
        
        bytes32 saplingRoot = headers[_blockHash].saplingRoot;
        bytes32 computedRoot = computeMerkleRoot(_noteCommitment, _proof);
        
        return computedRoot == saplingRoot;
    }
    
    /**
     * @notice Verify a note commitment using block height
     * @param _blockHeight The block height
     * @param _noteCommitment The note commitment to verify
     * @param _proof Merkle proof
     * @return True if valid
     */
    function verifyNoteCommitmentByHeight(
        uint256 _blockHeight,
        bytes32 _noteCommitment,
        MerkleProof calldata _proof
    ) external view returns (bool) {
        bytes32 blockHash = heightToHash[_blockHeight];
        require(blockHash != bytes32(0), "RelaySystem: block not found");
        require(isConfirmed(blockHash), "RelaySystem: block not confirmed");
        
        bytes32 saplingRoot = headers[blockHash].saplingRoot;
        bytes32 computedRoot = computeMerkleRoot(_noteCommitment, _proof);
        
        return computedRoot == saplingRoot;
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Parse Zcash block header components
     */
    function parseHeader(bytes calldata _header) 
        internal 
        pure 
        returns (
            bytes32 prevBlockHash,
            bytes32 merkleRoot,
            bytes32 saplingRoot,
            uint32 timestamp,
            uint32 bits
        ) 
    {
        require(_header.length >= 140, "RelaySystem: header too short");
        
        // Skip version (4 bytes), read prevBlockHash (32 bytes)
        prevBlockHash = bytes32(slice(_header, 4, 32));
        
        // Read merkleRoot (32 bytes)
        merkleRoot = bytes32(slice(_header, 36, 32));
        
        // Read hashFinalSaplingRoot (32 bytes) - THE KEY FIELD FOR ZCLAIM
        saplingRoot = bytes32(slice(_header, 68, 32));
        
        // Read timestamp (4 bytes, little-endian)
        timestamp = readUint32LE(_header, 100);
        
        // Read bits (4 bytes, little-endian)
        bits = readUint32LE(_header, 104);
    }
    
    /**
     * @notice Compute block hash using BLAKE2b-256
     * @dev In production, use a BLAKE2b precompile or optimized library
     */
    function computeBlockHash(bytes calldata _header) internal pure returns (bytes32) {
        // TODO: Implement proper BLAKE2b-256
        // For now, use keccak256 as placeholder (MUST be replaced)
        // Zcash uses BLAKE2b with personalization "ZcashBlockHash"
        return keccak256(_header);
    }
    
    /**
     * @notice Verify Equihash proof-of-work
     * @dev Zcash uses Equihash(n=200, k=9) which produces 2^9 = 512 indices
     */
    function verifyEquihash(bytes calldata _header, uint32 _bits) internal pure returns (bool) {
        // TODO: Implement Equihash verification
        // This is complex and gas-intensive. Options:
        // 1. Use a precompile (not available on Ethereum mainnet)
        // 2. Verify in a zk-SNARK circuit (our approach with circom)
        // 3. Trust relayers with bonds/slashing
        
        // For now, return true (MUST be replaced for production)
        return true;
    }
    
    /**
     * @notice Calculate work from difficulty bits
     */
    function calculateWork(uint32 _bits) internal pure returns (uint256) {
        // Extract exponent and mantissa from compact bits
        uint256 exponent = uint256(_bits >> 24);
        uint256 mantissa = uint256(_bits & 0x007fffff);
        
        if (exponent <= 3) {
            mantissa >>= 8 * (3 - exponent);
            exponent = 0;
        } else {
            exponent -= 3;
        }
        
        // Target = mantissa * 2^(8 * exponent)
        uint256 target = mantissa << (8 * exponent);
        
        if (target == 0) {
            return 0;
        }
        
        // Work = 2^256 / (target + 1)
        // Approximation to avoid overflow
        return type(uint256).max / (target + 1);
    }
    
    /**
     * @notice Compute Merkle root from leaf and proof
     * @dev Uses SHA256 double-hash (SHA256d) like Zcash
     */
    function computeMerkleRoot(
        bytes32 _leaf,
        MerkleProof calldata _proof
    ) internal pure returns (bytes32) {
        bytes32 currentHash = _leaf;
        uint256 index = _proof.index;
        
        for (uint256 i = 0; i < _proof.siblings.length; i++) {
            bytes32 sibling = _proof.siblings[i];
            
            // Determine if current node is left or right child
            if (index % 2 == 0) {
                // Current is left child
                currentHash = sha256d(abi.encodePacked(currentHash, sibling));
            } else {
                // Current is right child
                currentHash = sha256d(abi.encodePacked(sibling, currentHash));
            }
            
            index = index / 2;
        }
        
        return currentHash;
    }
    
    /**
     * @notice Double SHA256 hash
     */
    function sha256d(bytes memory _data) internal pure returns (bytes32) {
        return sha256(abi.encodePacked(sha256(_data)));
    }
    
    /**
     * @notice Read uint32 in little-endian format
     */
    function readUint32LE(bytes calldata _data, uint256 _offset) internal pure returns (uint32) {
        return uint32(uint8(_data[_offset])) |
               (uint32(uint8(_data[_offset + 1])) << 8) |
               (uint32(uint8(_data[_offset + 2])) << 16) |
               (uint32(uint8(_data[_offset + 3])) << 24);
    }
    
    /**
     * @notice Slice bytes array
     */
    function slice(bytes calldata _data, uint256 _start, uint256 _length) 
        internal 
        pure 
        returns (bytes memory) 
    {
        bytes memory result = new bytes(_length);
        for (uint256 i = 0; i < _length; i++) {
            result[i] = _data[_start + i];
        }
        return result;
    }
    
    // ============ View Functions ============
    
    function getHeader(bytes32 _blockHash) external view returns (BlockHeader memory) {
        return headers[_blockHash];
    }
    
    function getBlockHash(uint256 _height) external view returns (bytes32) {
        return heightToHash[_height];
    }
    
    function getChainTip() external view returns (bytes32, uint256) {
        return (chainTip, chainTipHeight);
    }
}
