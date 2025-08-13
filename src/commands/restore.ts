/**
 * Restore command - Restore snapshots from trash
 */

import { TrashManager } from "../utils/trash";
import { config } from "../config";

export interface RestoreOptions {
  verbose?: boolean;
  dryRun?: boolean;
}

export async function restore(snapshotIds: string[], options: RestoreOptions = {}): Promise<void> {
  const trashManager = new TrashManager();

  if (snapshotIds.length === 0) {
    console.error("❌ Error: No snapshot IDs provided");
    console.log("\n💡 Usage:");
    console.log("  kc restore <snapshot-id> [snapshot-id2] ...");
    console.log("  kc restore --help");
    console.log("\n📖 Examples:");
    console.log("  kc restore abc123        # Restore specific snapshot");
    console.log("  kc restore abc1 def2      # Restore multiple snapshots");
    console.log("  kc restore --dry-run abc1 # Preview what would be restored");
    process.exit(1);
  }

  const results = {
    restored: [] as string[],
    failed: [] as { id: string; error: string }[],
    notFound: [] as string[]
  };

  // Process with controlled concurrency (max 5 at once to avoid overwhelming filesystem)
  const batchSize = 5;
  for (let i = 0; i < snapshotIds.length; i += batchSize) {
    const batch = snapshotIds.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (snapshotId) => {
      // Validate input
      if (snapshotId.length < 4) {
        results.failed.push({
          id: snapshotId,
          error: `Snapshot ID '${snapshotId}' is too short. Use at least 4 characters to prevent accidental matches.`
        });
        return;
      }

      try {
        // Find matching trash items
        const matchingItems = trashManager.findTrashItem(snapshotId);

        if (matchingItems.length === 0) {
          results.notFound.push(snapshotId);
          return;
        }

        if (matchingItems.length > 1) {
          results.failed.push({
            id: snapshotId,
            error: `Multiple snapshots match '${snapshotId}': ${matchingItems.map(item => item.originalId).join(', ')}`
          });
          return;
        }

        const item = matchingItems[0];

        if (options.dryRun) {
          console.log(`🔍 Would restore: ${item.originalId} (${item.title || 'No title'})`);
          console.log(`   Trashed: ${new Date(item.trashedAt).toLocaleString()}`);
          return;
        }

        // Attempt restore
        const success = trashManager.restoreFromTrash(snapshotId);
        
        if (success) {
          results.restored.push(item.originalId);
          
          if (options.verbose) {
            console.log(`♻️  Restored: ${item.originalId}`);
            if (item.title) {
              console.log(`   Title: ${item.title}`);
            }
            console.log(`   Originally trashed: ${new Date(item.trashedAt).toLocaleString()}`);
          }
        } else {
          results.failed.push({
            id: snapshotId,
            error: "Restore operation failed"
          });
        }

      } catch (error) {
        results.failed.push({
          id: snapshotId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
    
    // Wait for batch to complete
    await Promise.all(batchPromises);
  }

  // Report results
  if (options.dryRun) {
    console.log(`\n🔍 Dry run completed. ${snapshotIds.length} snapshot(s) would be processed.`);
    return;
  }

  // Success summary
  if (results.restored.length > 0) {
    console.log(`✅ Successfully restored ${results.restored.length} snapshot(s):`);
    results.restored.forEach(id => console.log(`   • ${id}`));
  }

  // Error summary
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed to restore ${results.failed.length} snapshot(s):`);
    results.failed.forEach(({ id, error }) => {
      console.log(`   • ${id}: ${error}`);
    });
  }

  // Not found summary
  if (results.notFound.length > 0) {
    console.log(`\n❓ Not found in trash (${results.notFound.length}):`);
    results.notFound.forEach(id => console.log(`   • ${id}`));
    
    if (results.notFound.length > 0) {
      console.log(`\n💡 Use 'kc delete --show-trash' to see available items in trash`);
    }
  }

  // Exit with error code if any failures
  if (results.failed.length > 0 || results.notFound.length > 0) {
    process.exit(1);
  }
}