/**
 * ZCLAIM CLI Configuration
 * Loads environment variables and provides configuration
 */

import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Load .env file
dotenv.config();

// Config file path
const CONFIG_PATH = join(homedir(), '.zclaim', 'config.json');

/**
 * Default configuration
 */
const defaultConfig = {
  // Starknet settings
  starknet: {
    network: 'sepolia', // 'mainnet' | 'sepolia' | 'devnet'
    rpcUrl: process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io',
    accountAddress: process.env.STARKNET_ACCOUNT_ADDRESS || '',
    privateKey: process.env.STARKNET_PRIVATE_KEY || '',
  },
  
  // Contract addresses (Starknet)
  contracts: {
    bridge: process.env.BRIDGE_ADDRESS || '',
    relay: process.env.RELAY_ADDRESS || '',
    token: process.env.TOKEN_ADDRESS || '',
    registry: process.env.REGISTRY_ADDRESS || '',
  },
  
  // Zcash settings
  zcash: {
    network: 'testnet', // 'mainnet' | 'testnet'
    rpcUrl: process.env.ZCASH_RPC_URL || 'http://127.0.0.1:8232',
    rpcUser: process.env.ZCASH_RPC_USER || '',
    rpcPassword: process.env.ZCASH_RPC_PASSWORD || '',
  },
  
  // Bridge settings
  bridge: {
    minConfirmations: 20,
    issueTimeout: 86400, // 24 hours
    redeemTimeout: 86400, // 24 hours
    feeRate: 10, // 0.1% = 10/10000
  },
};

/**
 * Load configuration from file
 */
function loadConfig() {
  let config = { ...defaultConfig };
  
  if (existsSync(CONFIG_PATH)) {
    try {
      const fileConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
      config = mergeDeep(config, fileConfig);
    } catch (error) {
      console.warn('Warning: Could not parse config file, using defaults');
    }
  }
  
  return config;
}

/**
 * Deep merge objects
 */
function mergeDeep(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Get Starknet RPC URL for network
 */
function getStarknetRpcUrl(network) {
  const urls = {
    mainnet: 'https://starknet-mainnet.public.blastapi.io',
    sepolia: 'https://starknet-sepolia.public.blastapi.io',
    devnet: 'http://127.0.0.1:5050',
  };
  return urls[network] || urls.sepolia;
}

export const config = loadConfig();
export { getStarknetRpcUrl, defaultConfig };
