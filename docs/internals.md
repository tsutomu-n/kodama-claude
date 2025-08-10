# Technical Internals

🔴 **Difficulty**: Advanced | **Read time**: 20 minutes

Deep dive into how KODAMA Claude works internally.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Storage System](#storage-system)
- [File Locking](#file-locking)
- [Snapshot Management](#snapshot-management)
- [Session Handling](#session-handling)
- [Error Recovery](#error-recovery)
- [Performance Considerations](#performance-considerations)
- [Security Model](#security-model)

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────┐
│                   User Interface                 │
│                  (CLI Commands)                  │
└─────────────┬───────────────────────┬───────────┘
              │                       │
              ▼                       ▼
┌─────────────────────┐   ┌─────────────────────┐
│   Command Parser    │   │   Option Handler    │
│  (TypeScript/Bun)   │   │    (Validation)     │
└─────────────┬───────┘   └──────────┬──────────┘
              │                       │
              ▼                       ▼
┌─────────────────────────────────────────────────┐
│              Core Business Logic                 │
│         (Snapshot, Storage, Session)             │
└─────────────┬───────────────────────┬───────────┘
              │                       │
              ▼                       ▼
┌─────────────────────┐   ┌─────────────────────┐
│   Storage Layer     │   │   Claude CLI API    │
│  (File System I/O)  │   │   (Process Spawn)   │
└─────────────────────┘   └─────────────────────┘
```

### Component Relationships

```
kc binary
    ├── CLI Parser (commander.js style)
    ├── Commands
    │   ├── go.ts    → Storage + Claude
    │   ├── snap.ts  → Storage
    │   ├── plan.ts  → Storage
    │   ├── send.ts  → Storage + Claude
    │   └── doctor.ts → System Check
    ├── Storage Module
    │   ├── Snapshot Manager
    │   ├── Event Logger
    │   └── File Lock Handler
    └── Claude Integration
        ├── Session Manager
        ├── Context Formatter
        └── Process Controller
```

## Core Components

### 1. Storage Module (`storage.ts`)

Handles all file system operations with atomic writes and proper locking.

```typescript
class Storage {
    private dataDir: string;
    private lockFile: string;
    private lockFd?: number;
    
    constructor() {
        // XDG Base Directory compliance
        this.dataDir = process.env.KODAMA_DATA_DIR || 
                      path.join(os.homedir(), '.local/share/kodama-claude');
        this.lockFile = path.join(this.dataDir, '.lock');
    }
    
    // Atomic write with temp file + rename
    async writeAtomic(filepath: string, data: string): Promise<void> {
        const tmpFile = `${filepath}.tmp.${process.pid}`;
        
        try {
            // Write to temp file
            await fs.writeFile(tmpFile, data, { flag: 'w', mode: 0o644 });
            
            // Sync to disk
            const fd = await fs.open(tmpFile, 'r');
            await fd.sync();
            await fd.close();
            
            // Atomic rename
            await fs.rename(tmpFile, filepath);
            
            // Sync directory
            const dirFd = await fs.open(path.dirname(filepath), 'r');
            await dirFd.sync();
            await dirFd.close();
        } catch (error) {
            // Cleanup on failure
            try {
                await fs.unlink(tmpFile);
            } catch {}
            throw error;
        }
    }
    
    // File locking with timeout
    async acquireLock(timeout = 5000): Promise<boolean> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                // Try exclusive lock
                this.lockFd = await fs.open(this.lockFile, 'wx');
                await fs.write(this.lockFd, String(process.pid));
                return true;
            } catch (error) {
                if (error.code !== 'EEXIST') throw error;
                
                // Check if lock holder is alive
                const pid = await this.readLockPid();
                if (pid && !this.isProcessAlive(pid)) {
                    // Stale lock, remove
                    await fs.unlink(this.lockFile);
                    continue;
                }
                
                // Wait and retry
                await new Promise(r => setTimeout(r, 100));
            }
        }
        
        return false;
    }
}
```

### 2. Snapshot Manager (`snap.ts`)

Creates and manages context snapshots with validation.

```typescript
interface Snapshot {
    version: string;
    id: string;
    title: string;
    timestamp: string;
    step: 'designing' | 'implementing' | 'testing' | 'done';
    context: string;
    decisions: string[];
    nextSteps: string[];
    environment: {
        cwd: string;
        user: string;
        hostname: string;
    };
    git?: {
        branch: string;
        commit: string;
        status: string;
        remote: string;
    };
    metadata: {
        claudeSession?: string;
        previousSnapshot?: string;
    };
}

class SnapshotManager {
    // Generate deterministic snapshot ID
    private generateId(): string {
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex');
        return `${timestamp}-${random}`;
    }
    
    // Create snapshot with validation
    async create(data: Partial<Snapshot>): Promise<Snapshot> {
        const snapshot: Snapshot = {
            version: '1.0.0',
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            title: data.title || 'Untitled',
            step: data.step || 'implementing',
            context: data.context || '',
            decisions: data.decisions || [],
            nextSteps: data.nextSteps || [],
            environment: {
                cwd: process.cwd(),
                user: os.userInfo().username,
                hostname: os.hostname()
            },
            git: await this.getGitInfo(),
            metadata: {
                claudeSession: await this.getCurrentSession(),
                previousSnapshot: await this.getLatestSnapshotId()
            }
        };
        
        // Validate
        this.validateSnapshot(snapshot);
        
        // Save
        await this.save(snapshot);
        
        return snapshot;
    }
    
    // Snapshot validation
    private validateSnapshot(snapshot: Snapshot): void {
        // Check required fields
        if (!snapshot.id) throw new Error('Missing snapshot ID');
        if (!snapshot.timestamp) throw new Error('Missing timestamp');
        
        // Validate step
        const validSteps = ['designing', 'implementing', 'testing', 'done'];
        if (!validSteps.includes(snapshot.step)) {
            throw new Error(`Invalid step: ${snapshot.step}`);
        }
        
        // Check size limits
        const json = JSON.stringify(snapshot);
        if (json.length > 1024 * 1024) { // 1MB limit
            throw new Error('Snapshot too large');
        }
    }
}
```

### 3. Claude Integration (`claude.ts`)

Manages Claude CLI process and session handling.

```typescript
class ClaudeIntegration {
    private sessionFile: string;
    private claudePath: string;
    
    constructor(storage: Storage) {
        this.sessionFile = path.join(storage.dataDir, '.session');
        this.claudePath = process.env.CLAUDE_CLI_PATH || 'claude';
    }
    
    // Start Claude with context
    async startWithContext(snapshot: Snapshot): Promise<void> {
        // Format context
        const prompt = this.formatContext(snapshot);
        
        // Get or create session
        const sessionId = await this.getOrCreateSession();
        
        // Build command
        const args = ['--continue', sessionId];
        
        // Spawn Claude process
        const claude = spawn(this.claudePath, args, {
            stdio: 'inherit',
            env: {
                ...process.env,
                ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
            }
        });
        
        // Send context via stdin
        if (prompt) {
            claude.stdin?.write(prompt + '\n');
        }
        
        // Wait for completion
        await new Promise((resolve, reject) => {
            claude.on('exit', (code) => {
                if (code === 0) resolve(void 0);
                else reject(new Error(`Claude exited with code ${code}`));
            });
            
            claude.on('error', reject);
        });
    }
    
    // Format snapshot as context
    private formatContext(snapshot: Snapshot): string {
        const sections = [];
        
        // Previous work
        if (snapshot.context) {
            sections.push(`## Previous Work\n${snapshot.context}`);
        }
        
        // Decisions
        if (snapshot.decisions.length > 0) {
            sections.push(`## Decisions Made\n${snapshot.decisions.map(d => `- ${d}`).join('\n')}`);
        }
        
        // Next steps
        if (snapshot.nextSteps.length > 0) {
            sections.push(`## Next Steps\n${snapshot.nextSteps.map(s => `- ${s}`).join('\n')}`);
        }
        
        // Git context
        if (snapshot.git) {
            sections.push(`## Git Context\nBranch: ${snapshot.git.branch}\nCommit: ${snapshot.git.commit}`);
        }
        
        return sections.join('\n\n');
    }
}
```

## Data Flow

### Command Execution Flow

```
User Input → CLI Parser → Command Handler → Business Logic → Storage/Claude → Output
```

Detailed flow for `kc go`:

```
1. User: kc go -t "Feature work"
   ↓
2. CLI Parser: Parse options {title: "Feature work"}
   ↓
3. Go Command Handler:
   a. Acquire storage lock
   b. Load latest snapshot
   c. Create context prompt
   ↓
4. Claude Integration:
   a. Get/create session ID
   b. Spawn Claude process
   c. Send context via stdin
   d. Wait for user interaction
   ↓
5. On Claude Exit:
   a. Create new snapshot
   b. Update latest symlink
   c. Log event
   d. Release lock
   ↓
6. Output: "✓ Snapshot saved"
```

### Data Persistence Flow

```
Memory → Temp File → Atomic Rename → Persistent Storage → Symlink Update
```

## Storage System

### Directory Structure

```
$KODAMA_DATA_DIR/
├── snapshots/               # Snapshot storage
│   ├── YYYY-MM-DDTHH-MM-SS-{id}.json
│   └── latest.json → symlink
├── events.jsonl            # Append-only log
├── .session                # Current session
└── .lock                   # Process lock
```

### Atomic Operations

All writes use atomic operations to prevent corruption:

1. **Write to temp file**: `file.tmp.{pid}`
2. **Fsync temp file**: Force to disk
3. **Atomic rename**: `rename(temp, final)`
4. **Fsync directory**: Ensure directory entry updated

### Append-Only Event Log

```typescript
class EventLogger {
    private logPath: string;
    private writeStream?: fs.WriteStream;
    
    async log(event: string, data: any): Promise<void> {
        const entry = {
            timestamp: new Date().toISOString(),
            event,
            data,
            pid: process.pid
        };
        
        const line = JSON.stringify(entry) + '\n';
        
        // Append atomically
        await fs.appendFile(this.logPath, line, { flag: 'a' });
    }
    
    // Rotate log when too large
    async rotate(): Promise<void> {
        const stats = await fs.stat(this.logPath);
        if (stats.size > 10 * 1024 * 1024) { // 10MB
            const archive = `${this.logPath}.${Date.now()}`;
            await fs.rename(this.logPath, archive);
            
            // Compress in background
            exec(`gzip ${archive}`, () => {});
        }
    }
}
```

## File Locking

### Lock Implementation

Uses advisory file locking with PID tracking:

```typescript
class FileLock {
    private lockPath: string;
    private acquired = false;
    
    async acquire(timeout = 5000): Promise<boolean> {
        const deadline = Date.now() + timeout;
        
        while (Date.now() < deadline) {
            try {
                // Exclusive create
                const fd = await fs.open(this.lockPath, 'wx');
                
                // Write our PID
                await fs.write(fd, String(process.pid));
                await fd.close();
                
                this.acquired = true;
                
                // Register cleanup
                process.on('exit', () => this.release());
                process.on('SIGINT', () => this.release());
                process.on('SIGTERM', () => this.release());
                
                return true;
            } catch (err) {
                if (err.code === 'EEXIST') {
                    // Check if holder is alive
                    if (await this.isStale()) {
                        await this.breakLock();
                        continue;
                    }
                    
                    // Wait and retry
                    await sleep(100);
                } else {
                    throw err;
                }
            }
        }
        
        return false;
    }
    
    private async isStale(): Promise<boolean> {
        try {
            const pid = await fs.readFile(this.lockPath, 'utf8');
            return !process.kill(Number(pid), 0);
        } catch {
            return true;
        }
    }
}
```

### Deadlock Prevention

1. **Timeout**: All lock attempts timeout
2. **Stale detection**: Check if lock holder alive
3. **Auto-release**: On process exit
4. **No nested locks**: Single lock per process

## Snapshot Management

### Snapshot Lifecycle

```
Create → Validate → Save → Index → Link → Archive → Cleanup
```

### Versioning Strategy

```typescript
interface SnapshotVersion {
    '1.0.0': SnapshotV1;  // Current
    '0.9.0': SnapshotV0;  // Legacy
}

class SnapshotMigrator {
    migrate(snapshot: any): SnapshotV1 {
        const version = snapshot.version || '0.9.0';
        
        switch (version) {
            case '0.9.0':
                return this.migrateV0toV1(snapshot);
            case '1.0.0':
                return snapshot;
            default:
                throw new Error(`Unknown version: ${version}`);
        }
    }
    
    private migrateV0toV1(old: SnapshotV0): SnapshotV1 {
        return {
            ...old,
            version: '1.0.0',
            metadata: {
                migrated: true,
                originalVersion: '0.9.0'
            }
        };
    }
}
```

### Indexing System

```typescript
class SnapshotIndex {
    private indexPath: string;
    private index: Map<string, SnapshotMeta>;
    
    async rebuild(): Promise<void> {
        this.index.clear();
        
        const files = await fs.readdir(this.snapshotsDir);
        
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            if (file === 'latest.json') continue;
            
            const path = path.join(this.snapshotsDir, file);
            const stats = await fs.stat(path);
            
            // Parse filename for quick access
            const match = file.match(/^(\d{4}-\d{2}-\d{2})T.*-([a-f0-9]+)\.json$/);
            if (match) {
                this.index.set(match[2], {
                    id: match[2],
                    date: match[1],
                    path,
                    size: stats.size,
                    mtime: stats.mtime
                });
            }
        }
        
        // Save index
        await this.saveIndex();
    }
    
    async search(query: string): Promise<Snapshot[]> {
        const results = [];
        
        for (const [id, meta] of this.index) {
            const snapshot = await this.loadSnapshot(meta.path);
            
            // Search in title, context, decisions, nextSteps
            const searchable = [
                snapshot.title,
                snapshot.context,
                ...snapshot.decisions,
                ...snapshot.nextSteps
            ].join(' ').toLowerCase();
            
            if (searchable.includes(query.toLowerCase())) {
                results.push(snapshot);
            }
        }
        
        return results;
    }
}
```

## Session Handling

### Session State Machine

```
         ┌──────────┐
         │   IDLE   │
         └────┬─────┘
              │ start
              ▼
         ┌──────────┐
         │ STARTING │
         └────┬─────┘
              │ ready
              ▼
         ┌──────────┐
    ┌────│  ACTIVE  │────┐
    │    └────┬─────┘    │
    │ pause   │          │ error
    ▼         │ end      ▼
┌────────┐    ▼      ┌────────┐
│ PAUSED │────────►  │ ERROR  │
└────────┘           └────────┘
    │ resume             │
    └────────────────────┘
```

### Session Recovery

```typescript
class SessionManager {
    async recover(): Promise<string | null> {
        try {
            // Check for existing session
            const sessionId = await this.readSessionFile();
            
            // Validate session still alive
            if (await this.isSessionAlive(sessionId)) {
                return sessionId;
            }
            
            // Try to recover from Claude
            const sessions = await this.listClaudeSessions();
            const recent = this.getMostRecent(sessions);
            
            if (recent && this.isRecent(recent, 3600000)) { // 1 hour
                await this.saveSessionFile(recent.id);
                return recent.id;
            }
            
            return null;
        } catch {
            return null;
        }
    }
    
    private async isSessionAlive(sessionId: string): Promise<boolean> {
        try {
            const result = await exec(`claude --session-info ${sessionId}`);
            return result.exitCode === 0;
        } catch {
            return false;
        }
    }
}
```

## Error Recovery

### Error Handling Strategy

```typescript
class ErrorRecovery {
    async withRetry<T>(
        fn: () => Promise<T>,
        options: {
            maxRetries: number;
            backoff: 'linear' | 'exponential';
            initialDelay: number;
        }
    ): Promise<T> {
        let lastError: Error;
        
        for (let i = 0; i <= options.maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (!this.isRetryable(error)) {
                    throw error;
                }
                
                if (i < options.maxRetries) {
                    const delay = this.calculateDelay(i, options);
                    await sleep(delay);
                }
            }
        }
        
        throw lastError!;
    }
    
    private isRetryable(error: any): boolean {
        // Retryable errors
        const retryable = [
            'ENOENT',      // File not found (might be creating)
            'EACCES',      // Permission (might be temporary)
            'EAGAIN',      // Try again
            'EBUSY',       // Resource busy
            'ETIMEDOUT',   // Timeout
            'ECONNRESET'   // Connection reset
        ];
        
        return retryable.includes(error.code);
    }
}
```

### Corruption Recovery

```typescript
class CorruptionRecovery {
    async repairSnapshot(path: string): Promise<boolean> {
        try {
            // Try to parse
            const content = await fs.readFile(path, 'utf8');
            JSON.parse(content);
            return true; // Not corrupted
        } catch (error) {
            // Attempt repairs
            let fixed = content;
            
            // Fix common issues
            fixed = this.fixUnclosedBraces(fixed);
            fixed = this.fixTrailingCommas(fixed);
            fixed = this.fixUnescapedQuotes(fixed);
            
            try {
                JSON.parse(fixed);
                
                // Backup original
                await fs.rename(path, `${path}.corrupt`);
                
                // Save fixed
                await fs.writeFile(path, fixed);
                
                return true;
            } catch {
                // Unrecoverable
                await fs.rename(path, `${path}.corrupt`);
                return false;
            }
        }
    }
}
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
```typescript
class LazySnapshot {
    private path: string;
    private _data?: Snapshot;
    
    get data(): Promise<Snapshot> {
        if (!this._data) {
            this._data = this.load();
        }
        return this._data;
    }
}
```

2. **Memory Management**
```typescript
class SnapshotCache {
    private cache = new Map<string, Snapshot>();
    private maxSize = 50;
    
    get(id: string): Snapshot | undefined {
        const snapshot = this.cache.get(id);
        if (snapshot) {
            // LRU: Move to end
            this.cache.delete(id);
            this.cache.set(id, snapshot);
        }
        return snapshot;
    }
    
    set(id: string, snapshot: Snapshot): void {
        if (this.cache.size >= this.maxSize) {
            // Evict oldest (first)
            const first = this.cache.keys().next().value;
            this.cache.delete(first);
        }
        this.cache.set(id, snapshot);
    }
}
```

3. **Batch Operations**
```typescript
class BatchProcessor {
    private queue: Operation[] = [];
    private processing = false;
    
    async add(op: Operation): Promise<void> {
        this.queue.push(op);
        
        if (!this.processing) {
            this.processing = true;
            setImmediate(() => this.process());
        }
    }
    
    private async process(): Promise<void> {
        const batch = this.queue.splice(0, 100);
        
        await Promise.all(
            batch.map(op => this.execute(op))
        );
        
        if (this.queue.length > 0) {
            setImmediate(() => this.process());
        } else {
            this.processing = false;
        }
    }
}
```

### Performance Metrics

```typescript
class PerformanceMonitor {
    private metrics: Map<string, number[]> = new Map();
    
    async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        
        try {
            return await fn();
        } finally {
            const duration = performance.now() - start;
            
            if (!this.metrics.has(name)) {
                this.metrics.set(name, []);
            }
            
            this.metrics.get(name)!.push(duration);
            
            // Log slow operations
            if (duration > 1000) {
                console.warn(`Slow operation: ${name} took ${duration}ms`);
            }
        }
    }
    
    getStats(name: string): Stats {
        const times = this.metrics.get(name) || [];
        return {
            count: times.length,
            min: Math.min(...times),
            max: Math.max(...times),
            avg: times.reduce((a, b) => a + b, 0) / times.length,
            p95: this.percentile(times, 0.95)
        };
    }
}
```

## Security Model

### Security Principles

1. **No network access**: All data local
2. **User-only permissions**: 0600 for sensitive files
3. **No eval/dynamic code**: Static TypeScript only
4. **Input validation**: All user input sanitized
5. **Path traversal prevention**: Resolved paths only
6. **Command injection prevention**: Use execFileSync instead of execSync
7. **Environment variable validation**: Check required variables exist

### Security Enhancements

#### Command Injection Prevention

**Problem**: Using `execSync` with string concatenation can lead to command injection.

**Solution**: Use `execFileSync` with argument arrays:

```typescript
// UNSAFE - vulnerable to command injection
const dfOutput = execSync("df -h " + paths.data);

// SAFE - arguments are properly escaped
const dfOutput = execFileSync("df", ["-h", paths.data]);
```

#### Path Traversal Protection

**Problem**: User-supplied IDs could contain path traversal sequences.

**Solution**: Validate IDs before file operations:

```typescript
loadSnapshot(id: string): Snapshot | null {
    // Validate ID to prevent path traversal
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
        return null;
    }
    
    const path = join(this.paths.snapshots, `${id}.json`);
    // ... rest of implementation
}
```

#### Environment Variable Validation

**Problem**: Missing required environment variables can cause crashes.

**Solution**: Check and validate at startup:

```typescript
export function getStoragePaths() {
    const home = process.env.HOME;
    if (!home) {
        throw new Error("HOME environment variable is not set");
    }
    
    // Use XDG spec with fallbacks
    const xdgData = process.env.XDG_DATA_HOME || `${home}/.local/share`;
    const xdgConfig = process.env.XDG_CONFIG_HOME || `${home}/.config`;
    
    return {
        data: `${xdgData}/kodama-claude`,
        config: `${xdgConfig}/kodama-claude`,
        // ...
    };
}
```

### Permission Management

```typescript
class PermissionManager {
    async ensurePermissions(): Promise<void> {
        // Check data directory
        await this.setDirPerms(this.dataDir, 0o700);
        
        // Check snapshots
        await this.setDirPerms(this.snapshotsDir, 0o700);
        
        // Check sensitive files
        const sensitiveFiles = [
            '.session',
            '.lock'
        ];
        
        for (const file of sensitiveFiles) {
            const path = path.join(this.dataDir, file);
            if (await this.exists(path)) {
                await fs.chmod(path, 0o600);
            }
        }
    }
    
    private async setDirPerms(dir: string, mode: number): Promise<void> {
        await fs.mkdir(dir, { recursive: true, mode });
        await fs.chmod(dir, mode);
    }
}
```

---

**Congratulations!** You've completed the technical documentation. You now understand how KODAMA Claude works internally.

For questions or contributions, visit: https://github.com/tsutomu-n/kodama-claude