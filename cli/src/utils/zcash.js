/**
 * Zcash Utilities
 * Helper functions for interacting with Zcash
 */

import axios from 'axios';
import { config } from '../config.js';
import blake2 from 'blake2';

/**
 * Make RPC call to Zcash node
 */
export async function zcashRpc(method, params = []) {
  const { rpcUrl, rpcUser, rpcPassword } = config.zcash;
  
  try {
    const response = await axios.post(
      rpcUrl,
      {
        jsonrpc: '1.0',
        id: Date.now(),
        method,
        params,
      },
      {
        auth: rpcUser && rpcPassword ? {
          username: rpcUser,
          password: rpcPassword,
        } : undefined,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response.data.error) {
      throw new Error(`Zcash RPC error: ${response.data.error.message}`);
    }
    
    return response.data.result;
  } catch (error) {
    if (error.response) {
      throw new Error(`Zcash RPC failed: ${error.response.status} ${error.response.statusText}`);
    }
    throw error;
  }
}

/**
 * Get blockchain info
 */
export async function getBlockchainInfo() {
  return await zcashRpc('getblockchaininfo');
}

/**
 * Get block by height
 */
export async function getBlockByHeight(height, verbosity = 2) {
  const hash = await zcashRpc('getblockhash', [height]);
  return await zcashRpc('getblock', [hash, verbosity]);
}

/**
 * Get block by hash
 */
export async function getBlockByHash(hash, verbosity = 2) {
  return await zcashRpc('getblock', [hash, verbosity]);
}

/**
 * Get raw block header
 */
export async function getRawBlockHeader(hash) {
  const block = await zcashRpc('getblock', [hash, 0]);
  // First 140 bytes (1487 hex chars) is the header
  return block.substring(0, 280);
}

/**
 * Get Sapling commitment tree root from block
 */
export async function getSaplingRoot(blockHash) {
  const block = await getBlockByHash(blockHash, 1);
  return block.finalsaplingroot;
}

/**
 * Get current chain tip
 */
export async function getChainTip() {
  const info = await getBlockchainInfo();
  return {
    height: info.blocks,
    hash: info.bestblockhash,
  };
}

/**
 * Parse Zcash block header
 * Header structure (1487 bytes for Zcash):
 * - nVersion: 4 bytes
 * - hashPrevBlock: 32 bytes
 * - hashMerkleRoot: 32 bytes  
 * - hashFinalSaplingRoot: 32 bytes
 * - nTime: 4 bytes
 * - nBits: 4 bytes
 * - nNonce: 32 bytes
 * - nSolution: variable (1344 bytes for Equihash(200,9))
 */
export function parseBlockHeader(headerHex) {
  const header = Buffer.from(headerHex, 'hex');
  
  return {
    version: header.readUInt32LE(0),
    prevBlockHash: header.slice(4, 36).reverse().toString('hex'),
    merkleRoot: header.slice(36, 68).reverse().toString('hex'),
    saplingRoot: header.slice(68, 100).reverse().toString('hex'),
    timestamp: header.readUInt32LE(100),
    bits: header.readUInt32LE(104),
    nonce: header.slice(108, 140).toString('hex'),
    // Solution follows after nonce
  };
}

/**
 * Compute block hash using BLAKE2b-256 with Zcash personalization
 */
export function computeBlockHash(headerBytes) {
  const h = blake2.createHash('blake2b', { 
    digestLength: 32,
    personalization: Buffer.from('ZcashBlockHash\x00\x00', 'ascii')
  });
  h.update(headerBytes);
  return h.digest().reverse().toString('hex');
}

/**
 * Encode block header for Starknet submission
 * Returns array of felt252 values
 */
export function encodeHeaderForStarknet(header) {
  // Split each 32-byte hash into low/high u128 for u256
  const splitU256 = (hexStr) => {
    const buf = Buffer.from(hexStr, 'hex');
    const low = BigInt('0x' + buf.slice(16, 32).toString('hex'));
    const high = BigInt('0x' + buf.slice(0, 16).toString('hex'));
    return [low.toString(), high.toString()];
  };
  
  const encoded = [
    ...splitU256(header.prevBlockHash),  // [0-1]
    ...splitU256(header.merkleRoot),     // [2-3]
    ...splitU256(header.saplingRoot),    // [4-5]
    header.timestamp.toString(),          // [6]
    header.bits.toString(),               // [7]
  ];
  
  return encoded;
}

/**
 * Get z_viewingkey from a wallet
 */
export async function getViewingKey(zaddr) {
  return await zcashRpc('z_exportviewingkey', [zaddr]);
}

/**
 * List unspent notes for an address
 */
export async function listUnspentNotes(minconf = 1, maxconf = 9999999, includeWatchonly = true, addresses = null) {
  return await zcashRpc('z_listunspent', [minconf, maxconf, includeWatchonly, addresses]);
}

/**
 * Create and send a shielded transaction
 */
export async function sendShielded(fromAddr, toAddr, amount, memo = null) {
  const outputs = [{
    address: toAddr,
    amount: amount,
    memo: memo,
  }];
  
  const opid = await zcashRpc('z_sendmany', [fromAddr, outputs]);
  return opid;
}

/**
 * Get operation status
 */
export async function getOperationStatus(opid) {
  const results = await zcashRpc('z_getoperationresult', [[opid]]);
  return results[0];
}

/**
 * Wait for operation to complete
 */
export async function waitForOperation(opid, onStatus) {
  while (true) {
    const results = await zcashRpc('z_getoperationstatus', [[opid]]);
    const op = results[0];
    
    if (onStatus) {
      onStatus(op.status);
    }
    
    if (op.status === 'success') {
      // Get final result
      const final = await getOperationStatus(opid);
      return final;
    }
    
    if (op.status === 'failed') {
      throw new Error(`Operation failed: ${op.error.message}`);
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
