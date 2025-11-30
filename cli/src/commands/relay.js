/**
 * Relay Command
 * Manage Zcash block header relay to Starknet
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { config } from '../config.js';
import { getAccount, getContractWithAccount, waitForTransaction, bigIntToU256 } from '../utils/starknet.js';
import { getBlockByHeight, getBlockchainInfo, parseBlockHeader, encodeHeaderForStarknet, getRawBlockHeader } from '../utils/zcash.js';

// Relay contract ABI (simplified)
const RELAY_ABI = [
  {
    name: 'submit_block_header',
    type: 'function',
    inputs: [
      { name: 'header_data', type: 'felt*' },
      { name: 'height', type: 'felt' }
    ],
    outputs: [{ name: 'block_hash', type: 'Uint256' }]
  },
  {
    name: 'get_chain_tip',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'tip_hash', type: 'Uint256' },
      { name: 'tip_height', type: 'felt' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'is_confirmed',
    type: 'function',
    inputs: [{ name: 'block_hash', type: 'Uint256' }],
    outputs: [{ name: 'confirmed', type: 'felt' }],
    stateMutability: 'view'
  }
];

export const relayCommand = new Command('relay')
  .description('Manage Zcash block header relay');

/**
 * Submit a single block header
 */
relayCommand
  .command('submit')
  .description('Submit a Zcash block header to Starknet')
  .argument('<height>', 'Block height to submit')
  .option('--dry-run', 'Simulate without submitting')
  .action(async (height, options) => {
    const spinner = ora('Fetching block...').start();
    
    try {
      // Get block from Zcash node
      const heightNum = parseInt(height);
      const rawHeader = await getRawBlockHeader(await (async () => {
        const info = await getBlockByHeight(heightNum, 1);
        return info.hash;
      })());
      
      const header = parseBlockHeader(rawHeader);
      spinner.text = `Parsed block ${heightNum}: ${header.prevBlockHash.substring(0, 16)}...`;
      
      if (options.dryRun) {
        spinner.succeed('Dry run complete');
        console.log(chalk.cyan('Header data:'));
        console.log(JSON.stringify(header, null, 2));
        return;
      }
      
      // Encode for Starknet
      const encoded = encodeHeaderForStarknet(header);
      
      spinner.text = 'Submitting to Starknet...';
      
      // Get contract
      const contract = await getContractWithAccount(config.contracts.relay, RELAY_ABI);
      
      // Submit
      const tx = await contract.submit_block_header(encoded, heightNum);
      
      spinner.text = `Waiting for confirmation: ${tx.transaction_hash}`;
      
      await waitForTransaction(tx.transaction_hash, (status) => {
        spinner.text = `Transaction status: ${status}`;
      });
      
      spinner.succeed(chalk.green(`Block ${heightNum} submitted successfully!`));
      console.log(chalk.gray(`TX: ${tx.transaction_hash}`));
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Sync multiple blocks
 */
relayCommand
  .command('sync')
  .description('Sync block headers from Zcash to Starknet')
  .option('-s, --start <height>', 'Starting block height')
  .option('-e, --end <height>', 'Ending block height (default: current tip)')
  .option('-b, --batch <size>', 'Batch size', '10')
  .action(async (options) => {
    const spinner = ora('Checking chain state...').start();
    
    try {
      // Get Zcash chain tip
      const zcashInfo = await getBlockchainInfo();
      const zcashTip = zcashInfo.blocks;
      
      // Determine start and end
      const startHeight = options.start ? parseInt(options.start) : 1;
      const endHeight = options.end ? parseInt(options.end) : zcashTip;
      const batchSize = parseInt(options.batch);
      
      spinner.info(`Syncing blocks ${startHeight} to ${endHeight}`);
      
      let current = startHeight;
      while (current <= endHeight) {
        const batchEnd = Math.min(current + batchSize - 1, endHeight);
        spinner.text = `Processing blocks ${current} to ${batchEnd}...`;
        
        // Process batch
        for (let h = current; h <= batchEnd; h++) {
          spinner.text = `Submitting block ${h}/${endHeight}...`;
          
          try {
            const block = await getBlockByHeight(h, 1);
            const rawHeader = await getRawBlockHeader(block.hash);
            const header = parseBlockHeader(rawHeader);
            const encoded = encodeHeaderForStarknet(header);
            
            const contract = await getContractWithAccount(config.contracts.relay, RELAY_ABI);
            const tx = await contract.submit_block_header(encoded, h);
            
            await waitForTransaction(tx.transaction_hash);
            
            console.log(chalk.green(`  ✓ Block ${h}`));
          } catch (error) {
            console.log(chalk.yellow(`  ⚠ Block ${h}: ${error.message}`));
          }
        }
        
        current = batchEnd + 1;
      }
      
      spinner.succeed(chalk.green('Sync complete!'));
      
    } catch (error) {
      spinner.fail(chalk.red(`Sync failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Get relay status
 */
relayCommand
  .command('status')
  .description('Get relay chain status')
  .action(async () => {
    const spinner = ora('Fetching status...').start();
    
    try {
      // Get Zcash info
      const zcashInfo = await getBlockchainInfo();
      
      // Get relay contract info
      // TODO: Implement when contract is deployed
      
      spinner.stop();
      
      console.log(chalk.cyan('\n═══ Relay Status ═══\n'));
      
      console.log(chalk.white('Zcash Chain:'));
      console.log(`  Network:    ${zcashInfo.chain}`);
      console.log(`  Height:     ${zcashInfo.blocks}`);
      console.log(`  Tip:        ${zcashInfo.bestblockhash.substring(0, 32)}...`);
      
      console.log(chalk.white('\nStarknet Relay:'));
      if (config.contracts.relay) {
        console.log(`  Contract:   ${config.contracts.relay.substring(0, 20)}...`);
        console.log(`  Status:     ${chalk.yellow('Check with deployed contract')}`);
      } else {
        console.log(`  Status:     ${chalk.yellow('Not configured')}`);
      }
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

export default relayCommand;
