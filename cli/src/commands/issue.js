/**
 * Issue Command
 * Lock ZEC and mint wZEC (Issue protocol)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { config } from '../config.js';
import { getAccount, getContractWithAccount, waitForTransaction, bigIntToU256 } from '../utils/starknet.js';
import { sendShielded, waitForOperation, listUnspentNotes } from '../utils/zcash.js';

export const issueCommand = new Command('issue')
  .description('Lock ZEC and mint wZEC (Issue protocol)');

/**
 * Request a lock permit
 */
issueCommand
  .command('request')
  .description('Request a lock permit from a vault')
  .option('-v, --vault <address>', 'Vault address on Starknet')
  .option('-a, --amount <zec>', 'Amount of ZEC to lock')
  .action(async (options) => {
    const spinner = ora('Starting issue request...').start();
    
    try {
      // Interactive mode if options not provided
      let { vault, amount } = options;
      
      if (!vault || !amount) {
        spinner.stop();
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'vault',
            message: 'Vault address (Starknet):',
            when: !vault,
            validate: (v) => v.startsWith('0x') ? true : 'Invalid address',
          },
          {
            type: 'input',
            name: 'amount',
            message: 'Amount (ZEC):',
            when: !amount,
            validate: (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0 ? true : 'Invalid amount',
          },
        ]);
        vault = vault || answers.vault;
        amount = amount || answers.amount;
        spinner.start();
      }
      
      spinner.text = 'Requesting lock permit from bridge...';
      
      // TODO: Call bridge.request_lock() when contract is deployed
      // For now, simulate the response
      const mockNonce = Math.floor(Math.random() * 1000000);
      
      spinner.succeed(chalk.green('Lock permit requested!'));
      
      console.log(chalk.cyan('\n═══ Lock Permit ═══\n'));
      console.log(`  Nonce:       ${mockNonce}`);
      console.log(`  Vault:       ${vault}`);
      console.log(`  Amount:      ${amount} ZEC`);
      console.log(`  Expires:     ${new Date(Date.now() + 86400000).toISOString()}`);
      console.log('');
      console.log(chalk.yellow('Next step: zclaim issue lock <permit-nonce>'));
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Lock ZEC using permit
 */
issueCommand
  .command('lock')
  .description('Lock ZEC on Zcash network using a permit')
  .argument('<nonce>', 'Lock permit nonce')
  .option('-f, --from <zaddr>', 'Source z-address')
  .option('-a, --amount <zec>', 'Amount to lock')
  .action(async (nonce, options) => {
    const spinner = ora('Preparing lock transaction...').start();
    
    try {
      // Get permit details from Starknet
      // TODO: Fetch actual permit when contract is deployed
      
      let { from, amount } = options;
      
      if (!from || !amount) {
        spinner.stop();
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'from',
            message: 'Source z-address:',
            when: !from,
            validate: (v) => v.startsWith('zs') || v.startsWith('zt') ? true : 'Invalid z-address',
          },
          {
            type: 'input',
            name: 'amount',
            message: 'Amount (ZEC):',
            when: !amount,
            validate: (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0 ? true : 'Invalid amount',
          },
        ]);
        from = from || answers.from;
        amount = amount || answers.amount;
        spinner.start();
      }
      
      // Get vault's z-address from permit
      // TODO: Fetch from Starknet contract
      const vaultZaddr = 'zs1...vault'; // Placeholder
      
      spinner.text = 'Creating shielded transaction...';
      
      // Create memo with permit nonce for rcm derivation
      const memo = `ZCLAIM:LOCK:${nonce}`;
      
      // NOTE: In production, we would:
      // 1. Derive rcm from permit nonce
      // 2. Create custom note with specific commitment
      // 3. Encrypt with proper shared secret
      
      // For now, show what would happen
      spinner.info('Lock transaction preview:');
      console.log(`\n  From:   ${from}`);
      console.log(`  To:     ${vaultZaddr}`);
      console.log(`  Amount: ${amount} ZEC`);
      console.log(`  Memo:   ${memo}`);
      console.log('');
      
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with lock transaction?',
        default: false,
      }]);
      
      if (!confirm) {
        console.log(chalk.yellow('Cancelled'));
        return;
      }
      
      spinner.start('Sending transaction...');
      
      // Send shielded transaction
      // const opid = await sendShielded(from, vaultZaddr, parseFloat(amount), memo);
      // spinner.text = `Operation started: ${opid}`;
      // const result = await waitForOperation(opid, (status) => {
      //   spinner.text = `Operation status: ${status}`;
      // });
      
      spinner.succeed(chalk.green('Lock transaction sent!'));
      console.log(chalk.yellow('\nNext step: Wait for confirmations, then run:'));
      console.log(chalk.cyan(`  zclaim issue mint ${nonce}`));
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Submit mint proof
 */
issueCommand
  .command('mint')
  .description('Submit mint proof to receive wZEC')
  .argument('<nonce>', 'Lock permit nonce')
  .option('--tx <txid>', 'Zcash transaction ID')
  .option('--block <hash>', 'Block hash containing the transaction')
  .action(async (nonce, options) => {
    const spinner = ora('Preparing mint submission...').start();
    
    try {
      // In production:
      // 1. Get lock transaction details from Zcash
      // 2. Verify it has enough confirmations
      // 3. Generate zk-SNARK proof (πZKMint)
      // 4. Submit to bridge contract
      
      spinner.text = 'Generating ZK proof...';
      
      // This would use snarkjs/circom
      // const proof = await generateMintProof(nonce, txDetails);
      
      spinner.text = 'Submitting to bridge...';
      
      // const contract = await getContractWithAccount(config.contracts.bridge, BRIDGE_ABI);
      // const tx = await contract.mint(nonce, proof);
      // await waitForTransaction(tx.transaction_hash);
      
      spinner.succeed(chalk.green('Mint submitted!'));
      console.log(chalk.yellow('\nAwaiting vault confirmation...'));
      console.log(chalk.cyan(`  zclaim issue status ${nonce}`));
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Check issue status
 */
issueCommand
  .command('status')
  .description('Check issue request status')
  .argument('<nonce>', 'Lock permit nonce')
  .action(async (nonce) => {
    const spinner = ora('Fetching status...').start();
    
    try {
      // TODO: Fetch from bridge contract
      
      spinner.stop();
      
      console.log(chalk.cyan(`\n═══ Issue Status: ${nonce} ═══\n`));
      console.log(`  Status:      ${chalk.yellow('Pending confirmation')}`);
      console.log(`  Requested:   ${new Date().toISOString()}`);
      console.log(`  Vault:       0x...`);
      console.log(`  Amount:      1.5 ZEC`);
      console.log(`  Confirmations: 15/20`);
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * List available vaults for issue
 */
issueCommand
  .command('vaults')
  .description('List vaults available for issue')
  .action(async () => {
    const spinner = ora('Fetching vaults...').start();
    
    try {
      // TODO: Fetch from registry contract
      
      spinner.stop();
      
      console.log(chalk.cyan('\n═══ Available Vaults ═══\n'));
      console.log(chalk.gray('  Address                    │ Available    │ Fee'));
      console.log(chalk.gray('  ───────────────────────────┼──────────────┼─────'));
      console.log('  0x123...abc                │ 100.5 ZEC    │ 0.1%');
      console.log('  0x456...def                │ 50.0 ZEC     │ 0.2%');
      console.log('');
      console.log(chalk.gray('Use: zclaim issue request -v <address>'));
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

export default issueCommand;
