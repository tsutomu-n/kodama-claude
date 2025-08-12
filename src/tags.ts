/**
 * Tags command for listing and managing work tags
 */

import { TagManager } from "./utils/tags";
import { Storage } from "./storage";
import { formatRelativeTime } from "./utils/formatters";
import { config } from "./config";

export interface TagsOptions {
  list?: boolean;          // List all tags with counts
  filter?: string;         // Filter snapshots by tags
  stats?: boolean;         // Show tag statistics
  suggest?: string;        // Suggest tags based on partial
  merge?: boolean;         // Suggest tag merges
  json?: boolean;          // Output in JSON format
}

export async function tagsCommand(options: TagsOptions): Promise<void> {
  const tagManager = new TagManager();
  const storage = new Storage();
  
  // Default to list if no option specified
  if (!options.filter && !options.stats && !options.suggest && !options.merge) {
    options.list = true;
  }
  
  if (options.list) {
    await listTags(tagManager, options.json);
  } else if (options.filter) {
    await filterByTags(tagManager, storage, options.filter, options.json);
  } else if (options.stats) {
    await showTagStats(tagManager, options.json);
  } else if (options.suggest) {
    await suggestTags(tagManager, options.suggest, options.json);
  } else if (options.merge) {
    await suggestMerges(tagManager, options.json);
  }
}

/**
 * List all tags with usage counts
 */
async function listTags(tagManager: TagManager, json: boolean = false): Promise<void> {
  const stats = await tagManager.getTagStats();
  
  if (json) {
    console.log(JSON.stringify(stats.topTags, null, 2));
    return;
  }
  
  console.log("🏷️  Tags in use:\n");
  
  if (stats.topTags.length === 0) {
    console.log("   No tags found");
    return;
  }
  
  // Display as a table
  const maxTagLength = Math.max(...stats.topTags.map(t => t.tag.length));
  
  stats.topTags.forEach(({ tag, count }) => {
    const padding = " ".repeat(maxTagLength - tag.length);
    const bar = "█".repeat(Math.min(20, count));
    console.log(`   ${tag}${padding}  ${bar} (${count})`);
  });
  
  console.log(`\n   Total: ${stats.totalTags} unique tags`);
}

/**
 * Filter snapshots by tags
 */
async function filterByTags(
  tagManager: TagManager, 
  storage: Storage,
  tagString: string, 
  json: boolean = false
): Promise<void> {
  const tags = tagManager.parseTags(tagString);
  const snapshots = await tagManager.filterByTags(tags);
  
  if (json) {
    console.log(JSON.stringify(snapshots, null, 2));
    return;
  }
  
  console.log(`📦 Snapshots tagged with: ${tags.join(", ")}\n`);
  
  if (snapshots.length === 0) {
    console.log("   No snapshots found with these tags");
    return;
  }
  
  // Display snapshots
  snapshots.forEach((snapshot, index) => {
    const time = formatRelativeTime(new Date(snapshot.timestamp));
    console.log(`${index + 1}. ${snapshot.title}`);
    console.log(`   📅 ${time}`);
    console.log(`   🆔 ${snapshot.id}`);
    
    if (snapshot.tags && snapshot.tags.length > 0) {
      console.log(`   🏷️  ${snapshot.tags.join(", ")}`);
    }
    
    if (snapshot.step) {
      console.log(`   📊 Step: ${snapshot.step}`);
    }
    
    console.log("");
  });
}

/**
 * Show tag statistics
 */
async function showTagStats(tagManager: TagManager, json: boolean = false): Promise<void> {
  const stats = await tagManager.getTagStats();
  
  if (json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }
  
  console.log("📊 Tag Statistics\n");
  console.log(`Total unique tags: ${stats.totalTags}`);
  
  if (stats.topTags.length > 0) {
    console.log("\nMost used tags:");
    stats.topTags.slice(0, 5).forEach(({ tag, count }) => {
      console.log(`   ${tag}: ${count} uses`);
    });
  }
  
  if (stats.recentTags.length > 0) {
    console.log("\nRecently used tags:");
    console.log(`   ${stats.recentTags.join(", ")}`);
  }
}

/**
 * Suggest tags based on partial input
 */
async function suggestTags(
  tagManager: TagManager, 
  partial: string, 
  json: boolean = false
): Promise<void> {
  const suggestions = await tagManager.suggestTags(partial);
  
  if (json) {
    console.log(JSON.stringify(suggestions, null, 2));
    return;
  }
  
  console.log(`💡 Tag suggestions for "${partial}":\n`);
  
  if (suggestions.length === 0) {
    console.log("   No suggestions found");
    return;
  }
  
  suggestions.forEach(tag => {
    console.log(`   - ${tag}`);
  });
}

/**
 * Suggest tag merges for typos
 */
async function suggestMerges(tagManager: TagManager, json: boolean = false): Promise<void> {
  const merges = tagManager.suggestTagMerges();
  
  if (json) {
    console.log(JSON.stringify(merges, null, 2));
    return;
  }
  
  console.log("🔀 Suggested tag merges (potential typos):\n");
  
  if (merges.length === 0) {
    console.log("   No merge suggestions found");
    return;
  }
  
  merges.forEach(({ from, to, similarity }) => {
    const percent = Math.round(similarity * 100);
    console.log(`   "${from}" → "${to}" (${percent}% similar)`);
  });
  
  console.log("\n💡 To merge tags, manually update snapshots");
}