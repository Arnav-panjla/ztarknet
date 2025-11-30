/**
 * Status Command
 * Check bridge and transaction status
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { config } from '../config.js';
import { getProvider, getContract, u256ToBigInt } from '../utils/starknet.js';
import { getBlockchainInfo } from '../utils/zcash.js';

export const statusCommand = new Command('status')
  .description('Check bridge and transaction status');

/**
 * Bridge overview
 */
statusCommand
  .command('bridge')
  .alias('overview')
  .description('Get bridge overview status')
  .action(async () => {
    const spinner = ora('Fetching bridge status...').start();
    
    try {
      // Get Zcash info
      let zcashInfo = null;
      try {
        zcashInfo = await getBlockchainInfo();
      } catch (e) {
        // Zcash node may not be running
      }
      
      spinner.stop();
      
      console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                    ZCLAIM Bridge Status                      ║
╚══════════════════════════════════════════════════════════════╝
      `));
      
      // Zcash Status
      console.log(chalk.white('Zcash Network:'));
      if (zcashInfo) {
        console.log(`  Network:       ${zcashInfo.chain}`);
        console.log(`  Height:        ${zcashInfo.blocks.toLocaleString()}`);
        console.log(`  Sync:          ${(zcashInfo.verificationprogress * 100).toFixed(2)}%`);
        console.log(`  Connections:   ${zcashInfo.connections || 0}`);
      } else {
        console.log(`  Status:        ${chalk.yellow('Node not reachable')}`);
      }
      
      // Starknet Status
      console.log(chalk.white('\nStarknet Network:'));
      console.log(`  Network:       ${config.starknet.network}`);
      console.log(`  RPC:           ${config.starknet.rpcUrl || '(default)'}`);
      
      try {
        const provider = getProvider();
        const block = await provider.getBlock('latest');
        console.log(`  Block:         ${block.block_number.toLocaleString()}`);
      } catch (e) {
        console.log(`  Status:        ${chalk.yellow('RPC not reachable')}`);
      }
      
      // Contract Status
      console.log(chalk.white('\nContracts:'));
      const contracts = [
        ['Bridge', config.contracts.bridge],
        ['Relay', config.contracts.relay],
        ['Token', config.contracts.token],
        ['Registry', config.contracts.registry],
      ];
      
      for (const [name, addr] of contracts) {
        if (addr) {
          console.log(`  ${name.padEnd(12)} ${addr.substring(0, 20)}...`);
        } else {
          console.log(`  ${name.padEnd(12)} ${chalk.gray('(not configured)')}`);
        }
      }
      
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Check transaction status
 */
statusCommand
  .command('tx')
  .description('Check Starknet transaction status')
  .argument('<hash>', 'Transaction hash')
  .action(async (hash) => {
    const spinner = ora('Fetching transaction...').start();
    
    try {
      const provider = getProvider();
      
      let receipt;
      try {
        receipt = await provider.getTransactionReceipt(hash);
      } catch (e) {
        spinner.fail(chalk.yellow('Transaction not found'));
        return;
      }
      
      spinner.stop();
      
      console.log(chalk.cyan('\n═══ Transaction Status ═══\n'));
      console.log(`  Hash:          ${hash}`);
      console.log(`  Status:        ${getStatusColor(receipt.status)}`);
      console.log(`  Block:         ${receipt.block_number}`);
      
      if (receipt.events && receipt.events.length > 0) {
        console.log(`  Events:        ${receipt.events.length}`);
      }
      
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Check block status on relay
 */
statusCommand
  .command('block')
  .description('Check if a Zcash block is relayed')
  .argument('<hash>', 'Zcash block hash')
  .action(async (hash) => {
    const spinner = ora('Checking block status...').start();
    
    try {
      // TODO: Query relay contract when deployed
      
      spinner.stop();
      
      console.log(chalk.cyan('\n═══ Block Status ═══\n'));
      console.log(`  Hash:          ${hash}`);
      console.log(`  Relayed:       ${chalk.yellow('Check with deployed contract')}`);
      console.log(`  Confirmed:     ${chalk.yellow('Check with deployed contract')}`);
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Health check
 */
statusCommand
  .command('health')
  .description('Run health checks on all services')
  .action(async () => {
    console.log(chalk.cyan('\n═══ Health Check ═══\n'));
    
    // Check Starknet RPC
    process.stdout.write('  Starknet RPC:    ');
    try {
      const provider = getProvider();
      await provider.getBlock('latest');
      console.log(chalk.green('✓ Connected'));
    } catch (e) {
      console.log(chalk.red('✗ Failed'));
    }
    
    // Check Zcash RPC
    process.stdout.write('  Zcash RPC:       ');
    try {
      await getBlockchainInfo();
      console.log(chalk.green('✓ Connected'));
    } catch (e) {
      console.log(chalk.red('✗ Failed'));
    }
    
    // Check account configuration
    process.stdout.write('  Account Config:  ');
    if (config.starknet.accountAddress && config.starknet.privateKey) {
      console.log(chalk.green('✓ Configured'));
    } else {
      console.log(chalk.yellow('⚠ Not configured'));
    }
    
    // Check contracts
    process.stdout.write('  Contracts:       ');
    const hasContracts = config.contracts.bridge || config.contracts.relay;
    if (hasContracts) {
      console.log(chalk.green('✓ Configured'));
    } else {
      console.log(chalk.yellow('⚠ Not configured'));
    }
    
    console.log('');
  });

/**
 * Get colored status text
 */
function getStatusColor(status) {
  switch (status) {
    case 'ACCEPTED_ON_L2':
    case 'ACCEPTED_ON_L1':
      return chalk.green(status);
    case 'PENDING':
    case 'RECEIVED':
      return chalk.yellow(status);
    case 'REJECTED':
      return chalk.red(status);
    default:
      return status;
  }
}

export default statusCommand;
