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
  .description("List saved snapshots with filtering and sorting")
  .option("-n, --limit <number>", "Number of snapshots to show", "10")
  .option("--json", "Output as JSON")
  .option("-v, --verbose", "Show more details")
  .option("--since <date>", "Show snapshots since date (YYYY-MM-DD or relative)")
  .option("--until <date>", "Show snapshots until date")
  .option("--today", "Show snapshots from today")
  .option("--yesterday", "Show snapshots from yesterday")
  .option("--this-week", "Show snapshots from this week")
  .option("-t, --tags <tags>", "Filter by tags (comma/space separated)")
  .option("--sort <field>", "Sort by: date (default), title, size", "date")
  .option("--reverse", "Reverse sort order")
  .action(async (options) => {
    const { list } = await import("../src/commands/list");
    await list({
      limit: parseInt(options.limit, 10),
      json: options.json,
      verbose: options.verbose,
      since: options.since,
      until: options.until,
      today: options.today,
      yesterday: options.yesterday,
      thisWeek: options.thisWeek,
      tags: options.tags,
      sort: options.sort,
      reverse: options.reverse
    });
  });

// Show command (display specific snapshot)
program
  .command("show")
  .description("Show detailed information about a specific snapshot")
  .argument("<snapshot-id>", "Snapshot ID or partial ID to display")
  .option("--json", "Output as JSON")
  .option("-v, --verbose", "Show full details including complete context")
  .action(async (snapshotId, options) => {
    const { show } = await import("../src/commands/show");
    await show(snapshotId, {
      json: options.json,
      verbose: options.verbose
    });
  });

// Delete command (soft delete with trash)
program
  .command("delete")
  .description("Delete snapshots with soft delete (trash) functionality")
  .argument("[snapshot-ids...]", "Snapshot IDs to delete")
  .option("-f, --force", "Skip confirmation prompts")
  .option("--dry-run", "Show what would be deleted without deleting")
  .option("--json", "Output as JSON")
  .option("--older-than <time>", "Delete snapshots older than specified time (e.g. '30 days')")
  .option("--match <pattern>", "Delete snapshots matching pattern (shell wildcards)")
  .option("--restore", "Restore snapshots from trash")
  .option("--empty-trash", "Permanently delete all items in trash")
  .option("--show-trash", "Show contents of trash")
  .action(async (snapshotIds, options) => {
    const { deleteCommand } = await import("../src/commands/delete");
    await deleteCommand(snapshotIds, {
      force: options.force,
      dryRun: options.dryRun,
      json: options.json,
      olderThan: options.olderThan,
      match: options.match,
      restore: options.restore,
      emptyTrash: options.emptyTrash,
      showTrash: options.showTrash
    });
  });

// Search command (full-text search)
program
  .command("search")
  .description("Search snapshots using full-text search")
  .argument("<query>", "Search query")
  .option("--all", "Search all fields (title, context, decisions, steps, tags)")
  .option("-t, --tags <tags>", "Filter by tags (comma/space separated)")
  .option("-r, --regex", "Use regular expressions")
  .option("--since <date>", "Only search snapshots since date (YYYY-MM-DD or relative)")
  .option("--until <date>", "Only search snapshots until date")
  .option("-n, --limit <num>", "Maximum number of results", "10")
  .option("--json", "Output as JSON")
  .option("-c, --case-sensitive", "Case-sensitive search")
  .option("--suggestions", "Get search suggestions for partial query")
  .action(async (query, options) => {
    const { search } = await import("../src/commands/search");
    await search(query, {
      all: options.all,
      tags: options.tags,
      regex: options.regex,
      since: options.since,
      until: options.until,
      limit: parseInt(options.limit, 10),
      json: options.json,
      caseSensitive: options.caseSensitive,
      suggestions: options.suggestions
    });
  });

// Parse and execute
program.parse();