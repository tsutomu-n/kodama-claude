#!/usr/bin/env bun

/**
 * KODAMA Claude CLI - Minimal Claude Code extension
 * 
 * Philosophy: "Less is more" - Only 3 commands for junior developers
 * go / save / status - That's all you need.
 */

import { program } from "commander";
import { goCommand } from "../src/go";
import { saveCommand } from "../src/save";
import { statusCommand } from "../src/status";
import { version } from "../package.json";

program
  .name("kc")
  .description("KODAMA Claude - Simple context management for Claude Code CLI")
  .version(version)
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
  .action(saveCommand);

program
  .command("status")
  .description("Check session health status")
  .option("-j, --json", "Output in JSON format")
  .option("-s, --strict", "Exit with code 1 on danger (for CI/CD)")
  .action(statusCommand);

// Parse and execute
program.parse();