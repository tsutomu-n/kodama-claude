/**
 * Tag management utilities for work organization
 */

import { Storage } from "../storage";
import { getGitBranch } from "./git";
import { config } from "../config";
import type { Snapshot } from "../types";

/**
 * Tag manager for organizing work
 */
export class TagManager {
  private storage: Storage;
  private tagCache: Map<string, number> = new Map();
  
  constructor() {
    this.storage = new Storage();
  }
  
  /**
   * Normalize tag for consistency
   */
  normalizeTag(tag: string): string {
    return tag
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_/]/g, "")
      .substring(0, 50); // Max length
  }
  
  /**
   * Generate automatic tags based on context
   */
  generateAutoTags(): string[] {
    const tags: string[] = [];
    
    // Add git branch as tag
    const branch = getGitBranch();
    if (branch && branch !== "main" && branch !== "master") {
      tags.push(this.normalizeTag(branch));
    }
    
    // Add date-based tag for temporal organization
    const date = new Date();
    const dateTag = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    tags.push(dateTag);
    
    return tags;
  }
  
  /**
   * Parse tags from string (comma or space separated)
   */
  parseTags(input: string): string[] {
    if (!input) return [];
    
    // Split by comma or space
    const raw = input.split(/[,\s]+/).filter(Boolean);
    
    // Normalize and deduplicate
    const normalized = raw.map(tag => this.normalizeTag(tag));
    return [...new Set(normalized)];
  }
  
  /**
   * Suggest tags based on history
   */
  async suggestTags(partial?: string): Promise<string[]> {
    // Build tag frequency map if not cached
    if (this.tagCache.size === 0) {
      await this.buildTagCache();
    }
    
    // Get all tags sorted by frequency
    const allTags = Array.from(this.tagCache.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
    
    if (!partial) {
      return allTags.slice(0, 10); // Top 10 most used
    }
    
    // Filter by partial match
    const normalized = this.normalizeTag(partial);
    const matches = allTags.filter(tag => 
      tag.includes(normalized) || this.calculateSimilarity(tag, normalized) > 0.6
    );
    
    return matches.slice(0, 5);
  }
  
  /**
   * Build tag frequency cache from snapshots
   */
  private async buildTagCache(): Promise<void> {
    const snapshots = await this.storage.listSnapshots();
    
    for (const snapshot of snapshots) {
      if (snapshot.tags && Array.isArray(snapshot.tags)) {
        for (const tag of snapshot.tags) {
          const count = this.tagCache.get(tag) || 0;
          this.tagCache.set(tag, count + 1);
        }
      }
    }
  }
  
  /**
   * Calculate string similarity (simple Levenshtein-like)
   */
  private calculateSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * Simple Levenshtein distance
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[s2.length][s1.length];
  }
  
  /**
   * Filter snapshots by tags
   */
  async filterByTags(tags: string[]): Promise<Snapshot[]> {
    const snapshots = await this.storage.listSnapshots();
    
    if (tags.length === 0) {
      return snapshots;
    }
    
    const normalizedTags = tags.map(tag => this.normalizeTag(tag));
    
    return snapshots.filter(snapshot => {
      if (!snapshot.tags || snapshot.tags.length === 0) {
        return false;
      }
      
      // Check if snapshot has any of the requested tags
      return normalizedTags.some(tag => 
        snapshot.tags!.includes(tag)
      );
    });
  }
  
  /**
   * Get tag statistics
   */
  async getTagStats(): Promise<{
    totalTags: number;
    topTags: Array<{ tag: string; count: number }>;
    recentTags: string[];
  }> {
    await this.buildTagCache();
    
    const topTags = Array.from(this.tagCache.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
    
    // Get recent tags from last 10 snapshots
    const recentSnapshots = await this.storage.listSnapshots();
    const recentTags = new Set<string>();
    
    for (const snapshot of recentSnapshots.slice(0, 10)) {
      if (snapshot.tags) {
        snapshot.tags!.forEach((tag: string) => recentTags.add(tag));
      }
    }
    
    return {
      totalTags: this.tagCache.size,
      topTags,
      recentTags: Array.from(recentTags),
    };
  }
  
  /**
   * Merge similar tags (typo correction)
   */
  suggestTagMerges(): Array<{ from: string; to: string; similarity: number }> {
    const suggestions: Array<{ from: string; to: string; similarity: number }> = [];
    const tags = Array.from(this.tagCache.keys());
    
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const similarity = this.calculateSimilarity(tags[i], tags[j]);
        
        if (similarity > 0.8 && similarity < 1.0) {
          // Suggest merging to the more frequently used tag
          const count1 = this.tagCache.get(tags[i]) || 0;
          const count2 = this.tagCache.get(tags[j]) || 0;
          
          if (count1 > count2) {
            suggestions.push({ from: tags[j], to: tags[i], similarity });
          } else {
            suggestions.push({ from: tags[i], to: tags[j], similarity });
          }
        }
      }
    }
    
    return suggestions;
  }
}