#!/usr/bin/env node
/**
 * ZCLAIM CLI - Main Entry Point
 * Privacy-preserving Zcash to Starknet bridge CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { relayCommand } from './commands/relay.js';
import { issueCommand } from './commands/issue.js';
import { redeemCommand } from './commands/redeem.js';
import { vaultCommand } from './commands/vault.js';
import { configCommand } from './commands/config.js';
import { statusCommand } from './commands/status.js';

const program = new Command();

program
  .name('zclaim')
  .description('CLI for ZCLAIM bridge - Privacy-preserving Zcash to Starknet bridge')
  .version('0.1.0');

// Add subcommands
program.addCommand(relayCommand);
program.addCommand(issueCommand);
program.addCommand(redeemCommand);
program.addCommand(vaultCommand);
program.addCommand(configCommand);
program.addCommand(statusCommand);

// Default action
program.action(() => {
  console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                    ZCLAIM Bridge CLI                         ║
║          Privacy-preserving Zcash ↔ Starknet Bridge          ║
╚══════════════════════════════════════════════════════════════╝
  `));
  
  console.log(chalk.white('Available commands:'));
  console.log(chalk.yellow('  relay   ') + '- Manage block header relay');
  console.log(chalk.yellow('  issue   ') + '- Lock ZEC and mint wZEC (Issue protocol)');
  console.log(chalk.yellow('  redeem  ') + '- Burn wZEC and unlock ZEC (Redeem protocol)');
  console.log(chalk.yellow('  vault   ') + '- Manage vault operations');
  console.log(chalk.yellow('  config  ') + '- Configure CLI settings');
  console.log(chalk.yellow('  status  ') + '- Check bridge and transaction status');
  console.log('');
  console.log(chalk.gray('Run `zclaim <command> --help` for more information'));
});

program.parse();
