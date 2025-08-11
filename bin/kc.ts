#!/usr/bin/env bun

/**
 * KODAMA Claude CLI - Minimal Claude Code extension
 * 
 * Philosophy: "Less is more" - Focus only on what KODAMA can uniquely do
 * for Claude Code CLI that Claude cannot do for itself.
 */

import { program } from "commander";
import { goCommand } from "../src/go";
import { snapCommand } from "../src/snap";
import { sendCommand } from "../src/send";  
import { planCommand } from "../src/plan";
import { doctorCommand } from "../src/doctor";
import { version } from "../package.json";

program
  .name("kc")
  .description("KODAMA Claude - Persistent dialogue memory for Claude Code")
  .version(version)
  .option("-d, --debug", "Enable debug output");

// Group commands for better organization in help output
program.commandsGroup("Core Workflow Commands");

// Main one-command workflow
program
  .command("go")
  .description("Start or continue Claude session with full context")
  .option("-t, --title <title>", "Session title")
  .option("-s, --step <step>", "Workflow step (requirements/designing/implementing/testing)")
  .action(goCommand);

// Structured snapshot save  
program
  .command("snap")
  .description("Create structured snapshot of current dialogue")
  .option("-t, --title <title>", "Snapshot title")
  .option("-s, --step <step>", "Workflow step")
  .action(snapCommand);

// Send context to Claude
program
  .command("send")
  .description("Send saved context to Claude Code CLI")
  .argument("[snapshot-id]", "Snapshot ID to send (latest if omitted)")
  .action(sendCommand);

program.commandsGroup("Development Tools");

// Plan next steps (Phase 2)
program
  .command("plan")
  .description("Structure and plan next development steps")
  .option("-t, --title <title>", "Plan title")
  .action(planCommand);

program.commandsGroup("Maintenance");

// Health check
program
  .command("doctor")
  .description("Check system health and configuration")
  .action(doctorCommand);

// Parse and execute
program.parse();