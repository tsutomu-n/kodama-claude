# 内部構造

🔴 **難易度**: 上級 | **読了時間**: 7分

KODAMA Claudeの内部動作と設計原理を説明します。

## アーキテクチャ概要

```
┌─────────────────────────────────────┐
│         ユーザーインターフェース        │
│        (3つのコマンド: go/save/status) │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│          コアモジュール               │
│  ├── storage.ts (ストレージ管理)      │
│  ├── claude.ts (Claude CLI統合)      │
│  ├── guardian.ts (健康監視)          │
│  └── i18n.ts (国際化)               │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│         データレイヤー                │
│  ├── スナップショット (JSON)          │
│  ├── イベントログ (JSONL)            │
│  └── セッション状態 (.session)        │
└─────────────────────────────────────┘
```

## コアコンポーネント

### 1. ストレージマネージャー (`storage.ts`)

**責務:**
- スナップショットの読み書き
- アトミックファイル操作
- ファイルロック管理
- 自動アーカイブ

**主要機能:**
```typescript
class Storage {
  // アトミック書き込み（電源断対策）
  async writeAtomic(path: string, data: any) {
    const tempPath = `${path}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data));
    await fs.fsync(tempPath);  // ディスクに強制書き込み
    await fs.rename(tempPath, path);  // アトミックな置き換え
  }

  // ファイルロック
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const lockPath = `${this.basePath}/.lock`;
    // flock実装
  }
}
```

### 2. Claude統合 (`claude.ts`)

**2段階実行パターン:**
```typescript
class ClaudeIntegration {
  // ステージ1: コンテキスト注入
  async injectContext(context: string) {
    return spawn('claude', ['-c', '-p', context]);
  }

  // ステージ2: REPL起動
  async openREPL() {
    return spawn('claude', ['--continue'], { stdio: 'inherit' });
  }
}
```

**なぜ2段階？**
- 信頼性: 公式ドキュメント推奨の方法
- 柔軟性: コンテキスト注入のみも可能
- デバッグ: 各段階でエラー処理可能

### 3. ガーディアンシステム (`guardian.ts`)

**健康状態の判定ロジック:**

```typescript
interface HealthStatus {
  level: 'healthy' | 'warning' | 'danger' | 'unknown';
  basis: 'transcript' | 'heuristic' | 'no_session';
}

function assessHealth(transcript?: string, lastSnapshot?: Snapshot): HealthStatus {
  // 1. トランスクリプトベース（正確）
  if (transcript) {
    const usage = parseTokenUsage(transcript);
    if (usage > 0.8) return { level: 'danger', basis: 'transcript' };
    if (usage > 0.5) return { level: 'warning', basis: 'transcript' };
    return { level: 'healthy', basis: 'transcript' };
  }

  // 2. ヒューリスティック（推定）
  if (lastSnapshot) {
    const ageHours = (Date.now() - lastSnapshot.timestamp) / 3600000;
    if (ageHours > 4) return { level: 'danger', basis: 'heuristic' };
    if (ageHours > 2) return { level: 'warning', basis: 'heuristic' };
    return { level: 'healthy', basis: 'heuristic' };
  }

  // 3. データなし
  return { level: 'unknown', basis: 'no_session' };
}
```

### 4. 国際化システム (`i18n.ts`)

**言語検出優先順位:**
```typescript
function detectLanguage(): 'en' | 'ja' {
  // 1. 環境変数
  if (process.env.KODAMA_LANG === 'ja') return 'ja';
  
  // 2. システムロケール
  const locale = process.env.LANG || '';
  if (locale.startsWith('ja')) return 'ja';
  
  // 3. デフォルト
  return 'en';
}
```

## データフロー

### `kc go`の処理フロー

```
1. セッション確認
   └─> .sessionファイルを読み込み
   
2. 健康チェック
   ├─> トランスクリプト解析を試行
   └─> ヒューリスティック判定にフォールバック
   
3. 自動保護
   └─> 危険状態なら自動スナップショット
   
4. コンテキスト構築
   ├─> 最新5件の決定事項
   ├─> Git情報
   └─> 次のステップ
   
5. Claude起動
   ├─> ステージ1: claude -c -p "context"
   └─> ステージ2: claude --continue
```

### `kc save`の処理フロー

```
1. 入力収集
   ├─> 対話形式
   ├─> --stdin
   └─> --file
   
2. スナップショット作成
   ├─> UUID生成
   ├─> メタデータ付与
   └─> Git情報取得
   
3. アトミック保存
   ├─> 一時ファイルに書き込み
   ├─> fsync()でディスク同期
   └─> rename()でアトミック置換
   
4. イベント記録
   └─> events.jsonlに追記
   
5. クリップボード処理
   ├─> 方法検出（auto）
   ├─> フォールバック階層
   └─> エラー時は継続
```

## ファイルフォーマット

### スナップショットファイル

```json
{
  "version": "1.0.0",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "API実装完了",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "step": "implementing",
  "context": "ユーザー認証APIを実装中...",
  "decisions": [
    "JWTトークンを使用",
    "有効期限30分",
    "リフレッシュトークン実装"
  ],
  "nextSteps": [
    "統合テスト作成",
    "ドキュメント更新"
  ],
  "cwd": "/home/user/project",
  "gitBranch": "feature/auth",
  "gitCommit": "abc123def456"
}
```

### イベントログ（JSONL）

```jsonl
{"timestamp":"2024-01-01T12:00:00Z","type":"start","data":{"title":"Morning work"}}
{"timestamp":"2024-01-01T12:30:00Z","type":"snapshot","data":{"snapshotId":"550e8400","title":"API design"}}
{"timestamp":"2024-01-01T14:00:00Z","type":"protect","data":{"autoAction":true}}
{"timestamp":"2024-02-01T00:00:00Z","type":"archive","data":{"count":15}}
```

## セキュリティ設計

### ファイル権限

```bash
# umask設定で作成
umask 077  # ファイル: 600, ディレクトリ: 700

# 作成時の権限
open(path, O_CREAT | O_WRONLY, 0600)
mkdir(path, 0700)
```

### パス検証

```typescript
function validatePath(path: string): boolean {
  // パストラバーサル対策
  if (path.includes('..')) return false;
  
  // 安全でないパス拒否
  const unsafe = ['/', '/home', process.env.HOME];
  if (unsafe.includes(path)) return false;
  
  return true;
}
```

## パフォーマンス最適化

### スマートコンテキスト管理

```typescript
function buildContext(snapshots: Snapshot[]): string {
  // 最新5件に制限（デフォルト）
  const limit = process.env.KODAMA_NO_LIMIT ? Infinity : 5;
  
  // 決定事項を結合
  const decisions = snapshots
    .slice(-limit)
    .flatMap(s => s.decisions)
    .filter(Boolean);
  
  // 重複削除
  return [...new Set(decisions)].join('\n');
}
```

### 自動アーカイブ

```typescript
async function autoArchive() {
  const threshold = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  for (const file of await fs.readdir(snapshotsDir)) {
    const stat = await fs.stat(file);
    if (stat.mtime < threshold) {
      await fs.rename(
        path.join(snapshotsDir, file),
        path.join(archiveDir, file)
      );
    }
  }
}
```

## エラーハンドリング

### フォールバック戦略

```typescript
// クリップボードフォールバック
const copyMethods = [
  () => copyViaClipboard(),    // 1. システムクリップボード
  () => copyViaOSC52(),        // 2. ターミナルプロトコル
  () => copyViaFile(),         // 3. 一時ファイル
  () => console.log(content)   // 4. 標準出力
];

for (const method of copyMethods) {
  try {
    await method();
    break;
  } catch (e) {
    continue;  // 次の方法を試行
  }
}
```

## Bunランタイムの利点

### シングルバイナリ配布

```bash
# ビルドコマンド
bun build ./bin/kc.ts \
  --compile \
  --target=bun-linux-x64-baseline \
  --outfile=dist/kc-linux-x64

# 結果: 依存関係を含む単一実行ファイル
```

### 高速起動

```
Node.js: ~100ms
Bun:     ~10ms  (10倍高速)
```

### ネイティブTypeScriptサポート

```typescript
// トランスパイル不要
import { type Snapshot } from './types';
// 直接実行可能
```

## 設計原則

1. **シンプリシティ**: 3コマンドのみ
2. **信頼性**: アトミック操作、多重フォールバック
3. **パフォーマンス**: 最小限のI/O、スマートキャッシュ
4. **セキュリティ**: 厳格な権限、パス検証
5. **拡張性**: プラグインなし、コア機能に集中

---

**注記**: この内部構造の知識は、通常の使用には不要です。トラブルシューティングや貢献時の参考にしてください。