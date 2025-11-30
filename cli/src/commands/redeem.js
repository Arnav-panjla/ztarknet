/**
 * Redeem Command
 * Burn wZEC and unlock ZEC (Redeem protocol)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { config } from '../config.js';
import { getAccount, getContractWithAccount, waitForTransaction, bigIntToU256 } from '../utils/starknet.js';

export const redeemCommand = new Command('redeem')
  .description('Burn wZEC and unlock ZEC (Redeem protocol)');

/**
 * Request redemption
 */
redeemCommand
  .command('request')
  .description('Request to redeem wZEC for ZEC')
  .option('-a, --amount <wzec>', 'Amount of wZEC to burn')
  .option('-t, --to <zaddr>', 'Destination z-address')
  .option('-v, --vault <address>', 'Vault address (optional)')
  .action(async (options) => {
    const spinner = ora('Starting redeem request...').start();
    
    try {
      let { amount, to, vault } = options;
      
      if (!amount || !to) {
        spinner.stop();
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'amount',
            message: 'Amount (wZEC):',
            when: !amount,
            validate: (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0 ? true : 'Invalid amount',
          },
          {
            type: 'input',
            name: 'to',
            message: 'Destination z-address:',
            when: !to,
            validate: (v) => v.startsWith('zs') || v.startsWith('zt') ? true : 'Invalid z-address',
          },
          {
            type: 'input',
            name: 'vault',
            message: 'Vault address (optional, press enter to auto-select):',
            when: !vault,
          },
        ]);
        amount = amount || answers.amount;
        to = to || answers.to;
        vault = vault || answers.vault;
        spinner.start();
      }
      
      spinner.text = 'Preparing burn transaction...';
      
      // Generate encryption key for receiving the note
      // In production:
      // 1. Derive emk from user's viewing key
      // 2. Compute expected note commitment
      // 3. Encrypt destination address for vault
      
      const mockNonce = Math.floor(Math.random() * 1000000);
      
      spinner.succeed(chalk.green('Redeem request submitted!'));
      
      console.log(chalk.cyan('\n═══ Redeem Request ═══\n'));
      console.log(`  Nonce:       ${mockNonce}`);
      console.log(`  Amount:      ${amount} wZEC`);
      console.log(`  Destination: ${to}`);
      console.log(`  Vault:       ${vault || 'Auto-selected'}`);
      console.log('');
      console.log(chalk.yellow('wZEC has been burned. Awaiting vault release...'));
      console.log(chalk.cyan(`\nCheck status: zclaim redeem status ${mockNonce}`));
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Check redeem status
 */
redeemCommand
  .command('status')
  .description('Check redeem request status')
  .argument('<nonce>', 'Burn nonce')
  .action(async (nonce) => {
    const spinner = ora('Fetching status...').start();
    
    try {
      // TODO: Fetch from bridge contract
      
      spinner.stop();
      
      console.log(chalk.cyan(`\n═══ Redeem Status: ${nonce} ═══\n`));
      console.log(`  Status:        ${chalk.yellow('Awaiting release')}`);
      console.log(`  Requested:     ${new Date().toISOString()}`);
      console.log(`  Vault:         0x...`);
      console.log(`  Amount:        2.0 ZEC`);
      console.log(`  Destination:   zs1...`);
      console.log(`  Timeout:       ${new Date(Date.now() + 72000000).toISOString()}`);
      console.log('');
      console.log(chalk.gray('If vault fails to release, you can claim collateral after timeout.'));
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Claim collateral if vault fails
 */
redeemCommand
  .command('claim')
  .description('Claim vault collateral if release timeout expired')
  .argument('<nonce>', 'Burn nonce')
  .action(async (nonce) => {
    const spinner = ora('Checking eligibility...').start();
    
    try {
      // Check if timeout has expired
      // TODO: Fetch actual status from contract
      
      spinner.text = 'Claiming collateral...';
      
      // In production:
      // 1. Verify timeout has expired
      // 2. Call bridge.claim_collateral(nonce)
      // 3. Receive vault's slashed collateral
      
      spinner.succeed(chalk.green('Collateral claimed!'));
      console.log(chalk.yellow('\nVault collateral has been transferred to your account.'));
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * List pending redeems
 */
redeemCommand
  .command('list')
  .description('List your pending redemption requests')
  .action(async () => {
    const spinner = ora('Fetching redemptions...').start();
    
    try {
      // TODO: Fetch from contract
      
      spinner.stop();
      
      console.log(chalk.cyan('\n═══ Pending Redemptions ═══\n'));
      console.log(chalk.gray('  Nonce   │ Amount     │ Status            │ Timeout'));
      console.log(chalk.gray('  ────────┼────────────┼───────────────────┼─────────────────'));
      console.log('  123456  │ 2.0 ZEC    │ Awaiting release  │ 2024-12-02 10:00');
      console.log('  123457  │ 0.5 ZEC    │ Confirmed         │ -');
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

export default redeemCommand;
