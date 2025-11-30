// SPDX-License-Identifier: MIT
pragma solidity ^0.6.11;
pragma experimental ABIEncoderV2;

/**
 * @title IRelaySystem
 * @notice Interface for the Zcash block header relay system
 */
interface IRelaySystem {
    
    struct BlockHeader {
        bytes32 blockHash;
        bytes32 prevBlockHash;
        bytes32 merkleRoot;
        bytes32 saplingRoot;
        uint32 timestamp;
        uint32 bits;
        uint256 height;
        uint256 chainWork;
        bool verified;
    }
    
    struct MerkleProof {
        bytes32[] siblings;
        uint256 index;
    }
    
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
    
    // ============ Core Functions ============
    
    /**
     * @notice Submit a new block header
     * @param _headerBytes Raw header bytes
     * @param _height Block height
     * @return blockHash Hash of the submitted block
     */
    function submitBlockHeader(
        bytes calldata _headerBytes,
        uint256 _height
    ) external returns (bytes32 blockHash);
    
    /**
     * @notice Check if a block has enough confirmations
     * @param _blockHash Block hash to check
     * @return True if confirmed
     */
    function isConfirmed(bytes32 _blockHash) external view returns (bool);
    
    /**
     * @notice Get the Sapling commitment tree root for a block
     * @param _blockHash Block hash
     * @return hashFinalSaplingRoot
     */
    function getSaplingRoot(bytes32 _blockHash) external view returns (bytes32);
    
    /**
     * @notice Verify a note commitment exists in a block's Sapling tree
     * @param _blockHash Block containing the note
     * @param _noteCommitment Note commitment to verify
     * @param _proof Merkle proof
     * @return True if valid
     */
    function verifyNoteCommitment(
        bytes32 _blockHash,
        bytes32 _noteCommitment,
        MerkleProof calldata _proof
    ) external view returns (bool);
    
    /**
     * @notice Get block header data
     * @param _blockHash Block hash
     * @return Block header struct
     */
    function getHeader(bytes32 _blockHash) external view returns (BlockHeader memory);
    
    /**
     * @notice Get block hash by height
     * @param _height Block height
     * @return Block hash
     */
    function getBlockHash(uint256 _height) external view returns (bytes32);
    
    /**
     * @notice Get current chain tip
     * @return blockHash and height
     */
    function getChainTip() external view returns (bytes32, uint256);
}
