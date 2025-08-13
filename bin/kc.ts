#!/usr/bin/env bun

/**
 * Kodama for Claude Code - Unofficial extension for persistent context
 * 
 * Philosophy: "Less is more" - Only 3 commands for junior developers
 * go / save / status - That's all you need.
 * Plus uninstall for clean removal.
 */

import { program } from "commander";
import { goCommand } from "../src/go";
import { saveCommand } from "../src/save";
import { statusCommand } from "../src/status";
import { uninstallCommand } from "../src/uninstall";
import { version } from "../package.json";

program
  .name("kc")
  .description("Kodama for Claude Code - Unofficial extension for persistent context")
  .version(`Kodama for Claude Code ${version}`)
  .option("-d, --debug", "Enable debug output");

// Core 3 commands only
program
  .command("go")
  .description("Start or continue Claude session with context")
  .option("-t, --title <title>", "Session title")
  .option("-s, --step <step>", "Workflow step (designing/implementing/testing/done)")
  .option("--no-send", "Skip context injection (check only)")
  .action(goCommand);

program
  .command("save")
  .description("Save current work and optionally paste to clipboard")
  .option("-t, --title <title>", "Snapshot title")
  .option("-s, --step <step>", "Workflow step")
  .option("--stdin", "Read from stdin instead of interactive")
  .option("--file <path>", "Read from file")
  .option("-y, --yes", "Skip confirmation prompts")
  .option("--copy <mode>", "Copy mode: auto|clipboard|osc52|file|none (default: auto)")
  .option("--tags <tags>", "Work tags (comma/space separated)")
  .action(saveCommand);

program
  .command("status")
  .description("Check session health status")
  .option("-j, --json", "Output in JSON format")
  .option("-s, --strict", "Exit with code 1 on danger (for CI/CD)")
  .action(statusCommand);

// Uninstall command
program
  .command("uninstall")
  .description("Safely uninstall KODAMA Claude (preserves data by default)")
  .option("--remove-all", "Remove all data including snapshots")
  .option("--dry-run", "Show what would be removed without removing")
  .option("-f, --force", "Skip confirmation prompts")
  .option("--backup", "Create backup before removing data")
  .option("-q, --quiet", "Suppress non-error output")
  .action(uninstallCommand);

// Restart command (Smart Restart)
program
  .command("restart")
  .description("Smart restart with context preservation (/clear independent)")
  .option("-f, --force", "Force kill existing Claude process")
  .option("--no-inject", "Skip context injection")
  .option("--verify", "Verify context recognition")
  .action(async (options) => {
    const { restartCommand } = await import("../src/restart");
    await restartCommand(options);
  });

// Tags command (Work Tags)
program
  .command("tags")
  .description("Manage and filter work tags")
  .option("-l, --list", "List all tags with counts")
  .option("-f, --filter <tags>", "Filter snapshots by tags")
  .option("-s, --stats", "Show tag statistics")
  .option("--suggest <partial>", "Suggest tags based on partial input")
  .option("--merge", "Suggest tag merges for typos")
  .option("-j, --json", "Output in JSON format")
  .action(async (options) => {
    const { tagsCommand } = await import("../src/tags");
    await tagsCommand(options);
  });

// Resume command (One-Key Resume)
program
  .command("resume")
  .description("Quick resume with optional save (one-key operation)")
  .option("-m, --message <msg>", "Quick update message")
  .option("-t, --tags <tags>", "Tags for quick save")
  .option("--no-save", "Skip saving, just resume")
  .option("--no-inject", "Skip context injection")
  .option("-f, --force", "Force resume even with warnings")
  .action(async (options) => {
    const { resumeCommand } = await import("../src/resume");
    await resumeCommand(options);
  });

// List command (show saved snapshots)
program
  .command("list")
  .description("List saved snapshots")
  .option("-n, --limit <number>", "Number of snapshots to show", "10")
  .option("--json", "Output as JSON")
  .option("-v, --verbose", "Show more details")
  .action(async (options) => {
    const { list } = await import("../src/commands/list");
    await list({
      limit: parseInt(options.limit, 10),
      json: options.json,
      verbose: options.verbose
    });
  });

// Parse and execute
program.parse();