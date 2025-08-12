# APIリファレンス

🔴 **難易度**: 上級 | **読了時間**: 3分

KODAMA Claudeの3つのコマンドの完全な技術リファレンスです。

## コマンドリファレンス

### `kc go`

コンテキスト注入でClaudeセッションを開始または継続します。

```bash
kc go [オプション]
```

**オプション:**
| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|------------|
| `--title <title>` | `-t` | セッションタイトル | 前回のタイトル |
| `--step <step>` | `-s` | ワークフローステップ | 前回のステップ |
| `--no-send` | | コンテキスト注入をスキップ | false |
| `--debug` | `-d` | デバッグ出力 | false |

**ワークフローステップ:**
- `designing` - 計画フェーズ
- `implementing` - コーディングフェーズ
- `testing` - テストフェーズ
- `done` - 完了

**終了コード:**
- `0` - 成功
- `1` - Claude CLIが見つからない
- `2` - コンテキスト注入失敗

### `kc save`

スナップショットを保存し、オプションでクリップボードに貼り付けます。

```bash
kc save [オプション]
```

**オプション:**
| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|------------|
| `--title <title>` | `-t` | スナップショットタイトル | 対話形式で入力 |
| `--step <step>` | `-s` | ワークフローステップ | 対話形式で入力 |
| `--stdin` | | 標準入力から読み込み | false |
| `--file <path>` | | ファイルから読み込み | 対話モード |
| `--yes` | `-y` | プロンプトをスキップ | false |
| `--copy <mode>` | | コピーモード | auto |

**コピーモード:**
- `auto` - 最適な方法を検出
- `clipboard` - システムクリップボード
- `osc52` - ターミナルプロトコル
- `file` - 一時ファイル
- `none` - コピーしない

**終了コード:**
- `0` - 成功
- `1` - 保存失敗
- `2` - コピー失敗（保存は成功）

### `kc status`

セッションの健康状態を確認します。

```bash
kc status [オプション]
```

**オプション:**
| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|------------|
| `--json` | `-j` | JSON出力 | false |
| `--strict` | `-s` | 危険時にexit 1 | false |

**出力形式（デフォルト）:**
```
<絵文字> | basis: <ソース> | hint: <メッセージ>
```

**JSON出力:**
```json
{
  "level": "healthy|warning|danger|unknown",
  "basis": "transcript|heuristic|no_session",
  "lastSnapshot": {
    "id": "uuid",
    "title": "string",
    "ageHours": 2.5
  },
  "suggestion": "string",
  "autoAction": "snapshot|none"
}
```

**健康レベル:**
| レベル | 絵文字 | 条件 | アクション |
|--------|--------|------|------------|
| `healthy` | 🟢 | < 50% コンテキスト | 作業継続 |
| `warning` | 🟡 | 50-80% または 2時間以上 | そろそろ保存 |
| `danger` | 🔴 | > 80% コンテキスト | すぐに保存 |
| `unknown` | ❓ | セッションデータなし | `kc go`で開始 |

## 環境変数

### 言語とデバッグ
```bash
export KODAMA_LANG=ja           # 日本語メッセージ
export KODAMA_DEBUG=true        # デバッグ出力
```

### スマート機能
```bash
export KODAMA_NO_LIMIT=true     # 全決定事項を表示（5件制限なし）
export KODAMA_AUTO_ARCHIVE=false # 30日自動アーカイブを無効化
export KODAMA_CLAUDE_SYNC=true  # CLAUDE.md同期を有効化
```

## ファイル構造

```
~/.local/share/kodama-claude/
├── snapshots/              # JSONスナップショットファイル
│   ├── <uuid>.json        # 個別スナップショット
│   └── archive/           # 自動アーカイブ（30日以上）
├── events.jsonl           # 追記専用イベントログ
└── .session              # 現在のセッションID
```

### スナップショットJSONスキーマ

```typescript
interface Snapshot {
  version: "1.0.0";
  id: string;           // UUID v4
  title: string;
  timestamp: string;    // ISO 8601
  step?: "designing" | "implementing" | "testing" | "done";
  context?: string;
  decisions: string[];
  nextSteps: string[];
  cwd?: string;         // 作業ディレクトリ
  gitBranch?: string;
  gitCommit?: string;
}
```

### イベントログスキーマ

```typescript
interface Event {
  timestamp: string;    // ISO 8601
  type: "snapshot" | "start" | "protect" | "archive";
  data: {
    snapshotId?: string;
    title?: string;
    autoAction?: boolean;
  };
}
```

## ファイル権限

すべてのファイルはセキュアな権限で作成されます：

| タイプ | 権限 | 8進数 |
|--------|------|-------|
| ディレクトリ | `drwx------` | 700 |
| ファイル | `-rw-------` | 600 |

## 統合例

### Bash関数
```bash
kc-morning() {
  cd ~/projects/"$1"
  kc go -t "Morning: $1"
}
```

### Gitフック
```bash
#!/bin/bash
# .git/hooks/pre-commit
if [ "$(kc status --json | jq -r .level)" = "danger" ]; then
  echo "Auto-saving" | kc save --stdin -y
fi
```

### CI/CD
```yaml
- name: Save context if critical
  run: kc status --strict || echo "CI" | kc save --stdin -y
```

## エラーコード

| コード | 意味 |
|--------|------|
| 0 | 成功 |
| 1 | 一般エラー |
| 2 | Claude CLIが見つからない |
| 3 | ストレージエラー |
| 4 | 権限拒否 |
| 127 | コマンドが見つからない |

---

**注記**: このリファレンスは、簡略化された3コマンド構造のv0.3.0を対象としています。