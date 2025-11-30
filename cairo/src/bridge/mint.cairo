// ZCLAIM Bridge - Mint Helper Module
// Helper functions for Issue protocol (ZEC → wZEC)

use starknet::ContractAddress;
use zclaim::relay::types::{LockPermit, MintTransfer, MerkleProof};

/// Helper struct for mint transaction verification
#[derive(Drop, Copy, Serde)]
pub struct MintVerification {
    /// Was the proof verified successfully
    pub proof_valid: bool,
    /// Extracted value from commitment
    pub value: u256,
    /// Fee deducted
    pub fee: u256,
    /// Net amount to mint
    pub net_amount: u256,
}

/// Calculate fee for a given amount
/// Fee rate is expressed as parts per FEE_DENOMINATOR
pub fn calculate_fee(amount: u256, fee_rate: u256) -> u256 {
    const FEE_DENOMINATOR: u256 = 10000; // 100% = 10000
    
    if fee_rate == 0 {
        return 0;
    }
    
    (amount * fee_rate) / FEE_DENOMINATOR
}

/// Calculate net amount after fee deduction
pub fn calculate_net_amount(amount: u256, fee_rate: u256) -> u256 {
    amount - calculate_fee(amount, fee_rate)
}

/// Verify mint transaction proof (placeholder)
/// 
/// In production, this should:
/// 1. Verify the zk-SNARK proof (πZKMint)
/// 2. Verify the value commitment
/// 3. Verify the note commitment derivation
/// 4. Verify fee deduction
pub fn verify_mint_proof(
    transfer: @MintTransfer,
    permit: @LockPermit
) -> MintVerification {
    // TODO: Implement proper zk-SNARK verification
    // 
    // The proof should verify:
    // - cv = commit(v, rcv) - value commitment
    // - cvn = commit(v', rcv') - net value commitment
    // - v' = v - fee
    // - Note addressed to vault's Zcash address
    // - rcm derived from permit nonce
    
    // Placeholder: assume all proofs are valid
    let value = *transfer.cv;
    let fee = 0_u256;
    let net_amount = value;
    
    MintVerification {
        proof_valid: true,
        value,
        fee,
        net_amount,
    }
}

/// Derive the expected note commitment from mint parameters
/// 
/// A Zcash Sapling note commitment is:
/// cm = NoteCommit(g_d, pk_d, v, rcm)
pub fn derive_expected_note_commitment(
    _vault_address_hash: u256,
    _value: u256,
    _permit_nonce: u256
) -> u256 {
    // TODO: Implement proper note commitment derivation
    // 
    // This requires:
    // - g_d = diversified generator from vault address
    // - pk_d = vault's diversified transmission key
    // - rcm = randomness commitment derived from permit nonce
    // - Use the NoteCommit Pedersen hash
    
    0 // Placeholder
}

/// Encode lock permit for off-chain use
pub fn encode_lock_permit(permit: @LockPermit) -> Array<felt252> {
    let mut encoded: Array<felt252> = ArrayTrait::new();
    
    // Convert u256 to felt252 (lossy for large values)
    let nonce_felt: felt252 = (*permit.nonce).try_into().unwrap_or(0);
    let vault_addr_felt: felt252 = (*permit.vault_address_hash).try_into().unwrap_or(0);
    let user_emk_felt: felt252 = (*permit.user_emk).try_into().unwrap_or(0);
    
    encoded.append(nonce_felt);
    encoded.append(vault_addr_felt);
    encoded.append(user_emk_felt);
    encoded.append((*permit.issued_at).into());
    encoded.append((*permit.expires_at).into());
    
    encoded
}

#[cfg(test)]
mod tests {
    use super::{calculate_fee, calculate_net_amount};

    #[test]
    fn test_calculate_fee_zero() {
        let amount = 1000_u256;
        let fee_rate = 0_u256;
        assert(calculate_fee(amount, fee_rate) == 0, 'fee should be zero');
    }

    #[test]
    fn test_calculate_fee_one_percent() {
        let amount = 10000_u256;
        let fee_rate = 100_u256; // 1%
        assert(calculate_fee(amount, fee_rate) == 100, 'fee should be 100');
    }

    #[test]
    fn test_calculate_net_amount() {
        let amount = 10000_u256;
        let fee_rate = 100_u256; // 1%
        assert(calculate_net_amount(amount, fee_rate) == 9900, 'net should be 9900');
    }
}
