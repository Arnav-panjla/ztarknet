// Merkle Proof Verification for Cairo
// Verifies note commitments against Sapling tree root

use zclaim::relay::types::MerkleProof;

/// Verify a Merkle proof from leaf to root
/// Uses SHA256d (double SHA256) like Zcash
pub fn verify_merkle_proof(
    leaf: u256,
    root: u256,
    proof: MerkleProof
) -> bool {
    let computed_root = compute_merkle_root(leaf, proof);
    computed_root == root
}

/// Compute Merkle root from leaf and proof
pub fn compute_merkle_root(leaf: u256, proof: MerkleProof) -> u256 {
    let mut current_hash = leaf;
    let mut index = proof.index;
    let siblings = proof.siblings;
    
    let mut i: u32 = 0;
    let len = siblings.len();
    
    loop {
        if i >= len {
            break;
        }
        
        let sibling = *siblings.at(i);
        
        // Check if current node is left (0) or right (1) child
        if index % 2 == 0 {
            // Current is left child: hash(current || sibling)
            current_hash = sha256d_pair(current_hash, sibling);
        } else {
            // Current is right child: hash(sibling || current)
            current_hash = sha256d_pair(sibling, current_hash);
        }
        
        index = index / 2;
        i += 1;
    };
    
    current_hash
}

/// Double SHA256 of two u256 values concatenated
/// SHA256d(a || b) = SHA256(SHA256(a || b))
fn sha256d_pair(a: u256, b: u256) -> u256 {
    // TODO: Implement proper SHA256d
    // For now, use a simple placeholder
    // 
    // In production, use Cairo's SHA256 or a verified implementation
    // Note: Starknet has native Pedersen/Poseidon, but Zcash uses SHA256
    
    // Placeholder mixing function (NOT cryptographically secure)
    let mixed = a ^ b;
    let rotated = (mixed * 0x1000000007_u256) ^ a ^ (b * 0x100000001b3_u256);
    rotated
}

/// SHA256 of arbitrary data (placeholder)
pub fn sha256(data: @Array<felt252>) -> u256 {
    // TODO: Implement SHA256
    let mut hash: u256 = 0x6a09e667bb67ae853c6ef372a54ff53a510e527f9b05688c1f83d9ab5be0cd19_u256;
    
    let mut i: u32 = 0;
    let len = data.len();
    
    loop {
        if i >= len {
            break;
        }
        let val: felt252 = *data.at(i);
        let val_u256: u256 = val.into();
        hash = hash ^ val_u256;
        hash = (hash * 0x100000001b3_u256) ^ (val_u256 * 0x1000000007_u256);
        i += 1;
    };
    
    hash
}

/// Double SHA256
pub fn sha256d(data: @Array<felt252>) -> u256 {
    let first = sha256(data);
    // Convert u256 to Array<felt252> for second hash
    let mut arr: Array<felt252> = array![];
    arr.append(first.low.into());
    arr.append(first.high.into());
    sha256(@arr)
}

/// Sapling note commitment tree depth (32 levels)
pub const SAPLING_TREE_DEPTH: u32 = 32;

/// Verify proof has correct depth for Sapling
pub fn verify_proof_depth(proof: @MerkleProof) -> bool {
    proof.siblings.len() == SAPLING_TREE_DEPTH
}
