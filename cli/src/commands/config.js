/**
 * Config Command
 * Configure CLI settings
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { config, defaultConfig } from '../config.js';

const CONFIG_DIR = join(homedir(), '.zclaim');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export const configCommand = new Command('config')
  .description('Configure CLI settings');

/**
 * Initialize configuration
 */
configCommand
  .command('init')
  .description('Initialize configuration interactively')
  .action(async () => {
    console.log(chalk.cyan('\n═══ ZCLAIM CLI Configuration ═══\n'));
    
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'starknetNetwork',
        message: 'Starknet network:',
        choices: ['sepolia', 'mainnet', 'devnet'],
        default: 'sepolia',
      },
      {
        type: 'input',
        name: 'starknetRpc',
        message: 'Starknet RPC URL (press enter for default):',
        default: '',
      },
      {
        type: 'input',
        name: 'accountAddress',
        message: 'Starknet account address:',
        validate: (v) => !v || v.startsWith('0x') ? true : 'Invalid address',
      },
      {
        type: 'password',
        name: 'privateKey',
        message: 'Starknet private key:',
      },
      {
        type: 'list',
        name: 'zcashNetwork',
        message: 'Zcash network:',
        choices: ['testnet', 'mainnet'],
        default: 'testnet',
      },
      {
        type: 'input',
        name: 'zcashRpc',
        message: 'Zcash RPC URL:',
        default: 'http://127.0.0.1:8232',
      },
      {
        type: 'input',
        name: 'zcashUser',
        message: 'Zcash RPC username (optional):',
      },
      {
        type: 'password',
        name: 'zcashPassword',
        message: 'Zcash RPC password (optional):',
      },
    ]);
    
    const newConfig = {
      ...defaultConfig,
      starknet: {
        network: answers.starknetNetwork,
        rpcUrl: answers.starknetRpc || undefined,
        accountAddress: answers.accountAddress,
        privateKey: answers.privateKey,
      },
      zcash: {
        network: answers.zcashNetwork,
        rpcUrl: answers.zcashRpc,
        rpcUser: answers.zcashUser,
        rpcPassword: answers.zcashPassword,
      },
    };
    
    // Save config
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    
    writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    
    console.log(chalk.green('\n✓ Configuration saved to ~/.zclaim/config.json'));
    console.log(chalk.gray('  Use `zclaim config show` to view current settings'));
  });

/**
 * Show current configuration
 */
configCommand
  .command('show')
  .description('Show current configuration')
  .option('--reveal', 'Show sensitive values')
  .action((options) => {
    console.log(chalk.cyan('\n═══ Current Configuration ═══\n'));
    
    console.log(chalk.white('Starknet:'));
    console.log(`  Network:       ${config.starknet.network}`);
    console.log(`  RPC URL:       ${config.starknet.rpcUrl || '(default)'}`);
    console.log(`  Account:       ${config.starknet.accountAddress || '(not set)'}`);
    console.log(`  Private Key:   ${options.reveal ? config.starknet.privateKey : '(hidden)'}`);
    
    console.log(chalk.white('\nContracts:'));
    console.log(`  Bridge:        ${config.contracts.bridge || '(not set)'}`);
    console.log(`  Relay:         ${config.contracts.relay || '(not set)'}`);
    console.log(`  Token:         ${config.contracts.token || '(not set)'}`);
    console.log(`  Registry:      ${config.contracts.registry || '(not set)'}`);
    
    console.log(chalk.white('\nZcash:'));
    console.log(`  Network:       ${config.zcash.network}`);
    console.log(`  RPC URL:       ${config.zcash.rpcUrl}`);
    console.log(`  RPC User:      ${config.zcash.rpcUser || '(not set)'}`);
    
    console.log(chalk.white('\nBridge Settings:'));
    console.log(`  Confirmations: ${config.bridge.minConfirmations}`);
    console.log(`  Issue Timeout: ${config.bridge.issueTimeout}s`);
    console.log(`  Redeem Timeout: ${config.bridge.redeemTimeout}s`);
    console.log(`  Fee Rate:      ${config.bridge.feeRate / 100}%`);
    console.log('');
  });

/**
 * Set a configuration value
 */
configCommand
  .command('set')
  .description('Set a configuration value')
  .argument('<key>', 'Configuration key (e.g., starknet.network)')
  .argument('<value>', 'Configuration value')
  .action((key, value) => {
    // Load existing config
    let currentConfig = { ...defaultConfig };
    if (existsSync(CONFIG_PATH)) {
      currentConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    }
    
    // Set the value
    const keys = key.split('.');
    let obj = currentConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    
    // Save
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2));
    
    console.log(chalk.green(`✓ Set ${key} = ${value}`));
  });

/**
 * Set contract addresses
 */
configCommand
  .command('contracts')
  .description('Set contract addresses')
  .option('--bridge <address>', 'Bridge contract address')
  .option('--relay <address>', 'Relay contract address')
  .option('--token <address>', 'Token contract address')
  .option('--registry <address>', 'Registry contract address')
  .action((options) => {
    // Load existing config
    let currentConfig = { ...defaultConfig };
    if (existsSync(CONFIG_PATH)) {
      currentConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    }
    
    if (!currentConfig.contracts) {
      currentConfig.contracts = {};
    }
    
    if (options.bridge) currentConfig.contracts.bridge = options.bridge;
    if (options.relay) currentConfig.contracts.relay = options.relay;
    if (options.token) currentConfig.contracts.token = options.token;
    if (options.registry) currentConfig.contracts.registry = options.registry;
    
    // Save
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2));
    
    console.log(chalk.green('✓ Contract addresses updated'));
  });

export default configCommand;
