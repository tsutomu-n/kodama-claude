/**
 * Trash management utilities for safe deletion and recovery
 * Implements soft delete with 7-day retention policy
 */

import * as fs from "fs";
import * as path from "path";
import { getStoragePaths } from "../types";
import { config } from "../config";

export interface TrashItem {
  originalId: string;
  originalPath: string;
  trashedPath: string;
  trashedAt: string;
  title?: string;
  size?: number;
}

export interface TrashMetadata {
  items: TrashItem[];
  version: string;
}

export class TrashManager {
  private paths = getStoragePaths();
  private trashDir: string;
  private metadataFile: string;

  constructor() {
    this.trashDir = path.join(this.paths.data, ".trash");
    this.metadataFile = path.join(this.trashDir, "metadata.json");
    this.ensureTrashDirectory();
  }

  private ensureTrashDirectory(): void {
    if (!fs.existsSync(this.trashDir)) {
      fs.mkdirSync(this.trashDir, { recursive: true, mode: 0o700 });
    }
  }

  private loadMetadata(): TrashMetadata {
    if (!fs.existsSync(this.metadataFile)) {
      return { items: [], version: "1.0.0" };
    }

    try {
      const content = fs.readFileSync(this.metadataFile, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      if (config.debug) {
        console.warn("⚠️  Failed to load trash metadata, creating new:", error);
      }
      return { items: [], version: "1.0.0" };
    }
  }

  private saveMetadata(metadata: TrashMetadata): void {
    try {
      const content = JSON.stringify(metadata, null, 2);
      fs.writeFileSync(this.metadataFile, content, { mode: 0o600 });
    } catch (error) {
      throw new Error(`Failed to save trash metadata: ${error}`);
    }
  }

  /**
   * Move a snapshot to trash (soft delete)
   */
  moveToTrash(snapshotPath: string, snapshotId: string, title?: string): TrashItem {
    if (!fs.existsSync(snapshotPath)) {
      throw new Error(`Snapshot file does not exist: ${snapshotPath}`);
    }

    // Security: Validate paths
    if (!snapshotPath.startsWith(this.paths.snapshots) || 
        snapshotPath.includes('..') ||
        snapshotId.includes('..') ||
        snapshotId.includes('/') ||
        snapshotId.includes('\\')) {
      throw new Error("Invalid snapshot path or ID");
    }

    const stat = fs.statSync(snapshotPath);
    const timestamp = new Date().toISOString();
    const trashFileName = `${snapshotId}_${timestamp.replace(/[:.]/g, '-')}.json`;
    const trashedPath = path.join(this.trashDir, trashFileName);

    // Move file to trash
    try {
      fs.renameSync(snapshotPath, trashedPath);
    } catch (error) {
      throw new Error(`Failed to move snapshot to trash: ${error}`);
    }

    // Create trash item record
    const trashItem: TrashItem = {
      originalId: snapshotId,
      originalPath: snapshotPath,
      trashedPath,
      trashedAt: timestamp,
      title: title?.substring(0, 200),
      size: stat.size
    };

    // Update metadata
    const metadata = this.loadMetadata();
    metadata.items.push(trashItem);
    this.saveMetadata(metadata);

    if (config.debug) {
      console.log(`♻️  Moved to trash: ${snapshotId} -> ${trashFileName}`);
    }

    return trashItem;
  }

  /**
   * Restore a snapshot from trash
   */
  restoreFromTrash(snapshotId: string): boolean {
    // Validate input
    if (!snapshotId || snapshotId.length < 4) {
      throw new Error("Invalid snapshot ID. Must be at least 4 characters.");
    }
    
    const metadata = this.loadMetadata();
    const itemIndex = metadata.items.findIndex(item => 
      item.originalId === snapshotId ||
      item.originalId.startsWith(snapshotId)
    );

    if (itemIndex === -1) {
      return false;
    }

    const item = metadata.items[itemIndex];

    // Check if trash file exists
    if (!fs.existsSync(item.trashedPath)) {
      // Remove orphaned metadata entry
      metadata.items.splice(itemIndex, 1);
      this.saveMetadata(metadata);
      throw new Error(`Trash file not found: ${item.originalId}`);
    }

    // Check if target location is available
    if (fs.existsSync(item.originalPath)) {
      throw new Error(`Cannot restore: target file already exists (${item.originalId})`);
    }

    try {
      // Restore file
      fs.renameSync(item.trashedPath, item.originalPath);
      
      // Remove from trash metadata
      metadata.items.splice(itemIndex, 1);
      this.saveMetadata(metadata);

      if (config.debug) {
        console.log(`♻️  Restored from trash: ${snapshotId}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to restore snapshot: ${error}`);
    }
  }

  /**
   * List items in trash
   */
  listTrashItems(): TrashItem[] {
    const metadata = this.loadMetadata();
    
    // Verify trash files still exist and clean up orphaned entries
    const validItems: TrashItem[] = [];
    let hasOrphaned = false;

    for (const item of metadata.items) {
      if (fs.existsSync(item.trashedPath)) {
        validItems.push(item);
      } else {
        hasOrphaned = true;
        if (config.debug) {
          console.warn(`⚠️  Trash file not found: ${item.originalId}`);
        }
      }
    }

    // Update metadata if orphaned entries were found
    if (hasOrphaned) {
      metadata.items = validItems;
      this.saveMetadata(metadata);
    }

    // Sort by trash date (newest first)
    return validItems.sort((a, b) => 
      new Date(b.trashedAt).getTime() - new Date(a.trashedAt).getTime()
    );
  }

  /**
   * Clean up old trash items (older than retention days)
   */
  cleanupOldItems(retentionDays: number = 7): number {
    const metadata = this.loadMetadata();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const itemsToKeep: TrashItem[] = [];
    let deletedCount = 0;

    for (const item of metadata.items) {
      const trashedDate = new Date(item.trashedAt);
      
      if (trashedDate >= cutoff) {
        itemsToKeep.push(item);
      } else {
        // Permanently delete old trash item
        try {
          if (fs.existsSync(item.trashedPath)) {
            fs.unlinkSync(item.trashedPath);
            deletedCount++;
            
            if (config.debug) {
              console.log(`♻️  Permanently deleted: ${item.originalId} (${retentionDays}+ days old)`);
            }
          }
        } catch (error) {
          if (config.debug) {
            console.warn(`⚠️  Failed to delete old trash item ${item.originalId}:`, error);
          }
        }
      }
    }

    // Update metadata
    if (deletedCount > 0) {
      metadata.items = itemsToKeep;
      this.saveMetadata(metadata);
    }

    return deletedCount;
  }

  /**
   * Empty trash completely (permanent deletion)
   */
  emptyTrash(): number {
    const metadata = this.loadMetadata();
    let deletedCount = 0;

    for (const item of metadata.items) {
      try {
        if (fs.existsSync(item.trashedPath)) {
          fs.unlinkSync(item.trashedPath);
          deletedCount++;
          
          if (config.debug) {
            console.log(`♻️  Permanently deleted: ${item.originalId}`);
          }
        }
      } catch (error) {
        if (config.debug) {
          console.warn(`⚠️  Failed to delete trash item ${item.originalId}:`, error);
        }
      }
    }

    // Clear metadata
    metadata.items = [];
    this.saveMetadata(metadata);

    return deletedCount;
  }

  /**
   * Get trash statistics
   */
  getTrashStats(): { count: number; totalSize: number; oldestDate?: string } {
    const items = this.listTrashItems();
    
    const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
    const oldestDate = items.length > 0 
      ? items.reduce((oldest, item) => 
          new Date(item.trashedAt) < new Date(oldest) ? item.trashedAt : oldest, 
          items[0].trashedAt
        )
      : undefined;

    return {
      count: items.length,
      totalSize,
      oldestDate
    };
  }

  /**
   * Find trash item by partial ID
   */
  findTrashItem(partialId: string): TrashItem[] {
    // Security: Validate partial ID
    if (!partialId || 
        partialId.includes('..') || 
        partialId.includes('/') || 
        partialId.includes('\\')) {
      return [];
    }

    const items = this.listTrashItems();
    return items.filter(item => 
      item.originalId === partialId ||
      item.originalId.startsWith(partialId)
    );
  }
}