# KODAMA Claude

**日本語** | [English](README.md)

Claude Code CLI のための永続対話メモリ拡張ツール

> **Claude Code CLI とは**: Anthropic の公式ターミナルAIアシスタント。自然言語でコードを書き、デバッグし、リファクタリングする。`--continue` / `--resume` で会話を再開できるが、**意思決定や次のステップを構造化して保持する仕組みではない**。KODAMA がこの問題を解決。

## 理念

> 「Less is more」 ― KODAMA は、Claude Code CLI に対して必要なことだけをやる。

KODAMA Claude は **人間の意思決定ログ** を外部に構造化して保存する軽量ツール。`/clear` で会話履歴が消えても、セッションを切り替えても、**作業文脈を損なわない**設計。

## クイックスタート

### ワンライナーインストール（Ubuntu/WSL）

```bash
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
```

### 手動インストール

1. 使用アーキテクチャに合うバイナリをダウンロード
   - Linux x64: `kc-linux-x64`
   - Linux ARM64: `kc-linux-arm64`

2. 実行可能化して PATH に配置

```bash
chmod +x kc-linux-x64
sudo mv kc-linux-x64 /usr/local/bin/kc
```

## アンインストール

KODAMA Claudeは安全でユーザーフレンドリーなアンインストーラーを提供します（デフォルトでデータを保持）。

### クイックアンインストール（スナップショットを保持）
```bash
kc uninstall
# または
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/uninstall.sh | bash
```

### 完全削除（すべてのデータを含む）
```bash
kc uninstall --remove-all
```

### アンインストールオプション
- `--remove-all` - スナップショットを含むすべてのデータを削除
- `--backup` - データ削除前にバックアップを作成
- `--dry-run` - 削除対象をプレビュー
- `--force` - 確認プロンプトをスキップ

## 使い方

### コア3コマンド＋アンインストール

```bash
# コアワークフローコマンド
kc go       # Claudeを起動（健康チェック → 注入 → REPL）
kc save     # スナップショット保存＆貼り付け
kc status   # 健康状態を確認（🟢/🟡/🔴/❓）

# メンテナンス
kc uninstall # 安全な削除（デフォルトでデータ保持）
```

これで十分。複雑なワークフローも機能過多も不要。

## 日本語サポート

### エラーメッセージの日本語化

環境変数で日本語表示。

```bash
# 一時的に日本語化
export KODAMA_LANG=ja
kc go

# 永続的に日本語化
# Bash
echo 'export KODAMA_LANG=ja' >> ~/.bashrc
source ~/.bashrc

# Zsh
echo 'export KODAMA_LANG=ja' >> ~/.zshrc
source ~/.zshrc

# XDG 準拠（systemd 環境）
mkdir -p ~/.config/environment.d
echo 'KODAMA_LANG=ja' >> ~/.config/environment.d/kodama.conf
# 再ログインで有効化
```

システムロケールが日本語なら自動検出。

## コマンド詳細

### `kc go` - Claudeセッションを開始

```bash
kc go [オプション]
  -t, --title <title>    セッションタイトル
  -s, --step <step>      ワークフローステップ (designing/implementing/testing/done)
  --no-send              コンテキスト注入をスキップ（チェックのみ）
```

**動作：**
1. 健康チェックと自動保護
2. `claude -c -p`でコンテキスト注入
3. `claude --continue`でREPLを開く

### `kc save` - 保存＆貼り付け

```bash
kc save [オプション]
  -t, --title <title>    スナップショットタイトル
  -s, --step <step>      ワークフローステップ
  --stdin                stdinから読み込み
  --file <path>          ファイルから読み込み
  -y, --yes              プロンプトをスキップ
  --copy <mode>          auto|clipboard|osc52|file|none (デフォルト: auto)
```

**対話モード**（デフォルト）：
- タイトル、ステップ、達成内容、決定事項、次のステップ
- EOF: Unix/Mac = Ctrl+D、WSL = Ctrl+Z
- 保存後に貼り付けを促す

### `kc status` - 健康状態

```bash
kc status [オプション]
  -j, --json             JSON出力
  -s, --strict           危険時にexit 1 (CI/CD用)
```

**出力：** `🟢 | basis: transcript | hint: no action needed`

## 日常のワークフロー

### 朝の開始

```bash
# 昨日の作業を確認して継続
kc go
```

### 途中の保存

```bash
# 詳細なスナップショットを作成
kc save
# タイトル・達成内容・次のステップを入力
```

### 夕方の終了

```bash
# 今日の作業を保存
kc save -t "本日の作業完了"
```

### 実例：API エンドポイント追加

```bash
# 1. 朝：作業開始
$ kc go
▶ Starting Claude session
  1. Check health & create snapshot
  2. Inject context with -c -p
  3. Open REPL with --continue

🟢 Session status: healthy
📸 Last snapshot: 2h ago
📤 Injecting context...
✅ Context injected successfully
🚀 Opening Claude REPL...

# 2. Claude と対話（インタラクティブセッション）

# 3. 進捗を保存
$ kc save -t "認証API完了"
📝 Save your work context
[対話形式のプロンプト...]
[Y/n] Paste to clipboard now? y
✅ Context copied to clipboard

# 4. いつでも状態確認
$ kc status
🟡 | basis: heuristic | hint: save recommended
```

### 各コマンドの使い時

- **`kc go`**: 一日の始まりや作業再開（全自動）
- **`kc save`**: 休憩前、タスク切り替え、または促された時
- **`kc status`**: 健康状態の確認（CI/CDでは--strict付き）

Claude が文脈を理解し、Git がコード変更を追跡。

## 機能

### KODAMA ができること

✅ **セッション健康追跡** ― トークン使用量の監視と警告  
✅ **自動保護** ― コンテキスト危険時の自動スナップショット  
✅ **アトミックなファイル更新** ― 電源断でも破損しない  
✅ **適切なファイルロック** ― 安全な同時アクセス  
✅ **XDG 準拠** ― Linux ディレクトリ標準に従う  
✅ **単一バイナリ** ― コア機能は実行時依存なし  
✅ **Git 連携** ― ブランチとコミットの文脈を追跡  
✅ **スマートなコンテキスト管理** ― 決定事項を最新5件に自動制限  
✅ **自動アーカイブ** ― 30日超のスナップショットを整理  
✅ **CLAUDE.md 連携** ― AI コンテキストを自動同期（オプトイン）  

### KODAMA がやらないこと

❌ クラウド同期（同期は Git を使う）  
❌ 複雑なワークフロー（既存ツールを使う）  
❌ UI（CLI のみ）  
❌ AI 機能（AI は Claude が担当）  
❌ プロジェクト管理（GitHub/Jira を使う）  

## 技術詳細

### 実行時依存関係

**必須**: なし（単一バイナリで動作）

**オプション**（拡張機能用）:
- **クリップボード連携**: 
  - Linux X11: `xclip` または `xsel`
  - Linux Wayland: `wl-clipboard`
  - macOS: `pbcopy`（組み込み）
  - Windows/WSL: `clip.exe`
- **デスクトップ統合**:
  - Linux: `xdg-utils`（ファイルを開く）
  - 全OS: `notify-send`（デスクトップ通知）

> 💡 **注**: KODAMA はこれらのパッケージなしでも動作します。利用できない場合は以下にフォールバック:
> - OSC52 ターミナルクリップボードプロトコル
> - コンテキスト渡し用の一時ファイル
> - 通知の代わりにコンソール出力

### ストレージ場所

XDG Base Directory 準拠。

```
~/.local/share/kodama-claude/
├── snapshots/          # JSON スナップショット
│   └── archive/        # 30日超の自動アーカイブ
├── events.jsonl        # 追記専用イベントログ
└── .session            # 現在の Claude セッション ID
```

### ファイルパーミッション

KODAMA はセキュリティベストプラクティスに従ったパーミッション設定：

| パス | パーミッション | 説明 |
|------|------------|------|
| `~/.local/share/kodama-claude/` | `700` (drwx------) | メインデータディレクトリ |
| `snapshots/` | `700` (drwx------) | スナップショットディレクトリ |
| `snapshots/archive/` | `700` (drwx------) | アーカイブディレクトリ |
| `*.json` ファイル | `600` (-rw-------) | スナップショットファイル |
| `events.jsonl` | `600` (-rw-------) | イベントログ |
| `.session` | `600` (-rw-------) | セッションID |

**セキュリティ注記：**
- すべてのディレクトリは `700`（所有者のみアクセス可）で作成
- すべてのファイルは `600`（所有者のみ読み書き可）で作成
- グループやその他のユーザーには権限を付与しない
- データ整合性のためfsyncでアトミックにファイル書き込み

### 環境変数

```bash
# スマートコンテキスト管理
export KODAMA_NO_LIMIT=true        # 決定事項5件制限を無効化
export KODAMA_AUTO_ARCHIVE=false   # 自動アーカイブを無効化
export KODAMA_CLAUDE_SYNC=true     # CLAUDE.md 自動更新を有効化
export KODAMA_DEBUG=true           # デバッグ出力を有効化
export KODAMA_LANG=ja              # 日本語エラーメッセージ
```

### スナップショット形式

```json
{
  "version": "1.0.0",
  "id": "uuid-here",
  "title": "機能実装",
  "timestamp": "2024-01-01T00:00:00Z",
  "step": "implementing",
  "context": "達成したこと...",
  "decisions": ["PostgreSQLを使用", "..."],
  "nextSteps": ["テストを追加", "..."],
  "cwd": "/home/user/project",
  "gitBranch": "feature/auth",
  "gitCommit": "abc123"
}
```

## トラブルシューティング

### よくある問題と解決

| 問題 | 解決 |
|------|------|
| `kc: コマンドが見つかりません` | `/usr/local/bin` を PATH に追加 |
| `権限がありません` | `sudo chmod +x /usr/local/bin/kc` |
| `Claude Code CLI が見つかりません` | Claude Code CLI をインストール |
| `認証が必要` | `claude` で OAuth 認証 |
| スナップショット保存に失敗 | `chmod 755 ~/.local/share/kodama-claude` |

### デバッグモード

詳細情報を出力。

```bash
# デバッグ出力を有効化
KODAMA_DEBUG=1 kc go
```

## ソースからビルド

要件
- Bun >= 1.0.0

```bash
# リポジトリを取得
git clone https://github.com/tsutomu-n/kodama-claude
cd kodama-claude

# 依存関係をインストール
bun install

# バイナリをビルド
bun run build:all

# バイナリは dist/ に生成
ls dist/
```

## 設計原則

1. **ジュニア優先** ― 30秒で使えないなら複雑すぎる
2. **一つに集中** ― Claude 対話メモリの永続化だけをやる
3. **優雅に失敗** ― すべての操作にフォールバックを用意
4. **ゼロフリクション** ― 設定不要・即動作

## FAQ

**Q: なぜ3コマンドだけ？**  
A: ジュニア開発者にはシンプルさが必要。それ以外は全て自動化または統合済み。

**Q: snap/check/send/planはどこへ？**  
A: 3つのコアコマンドに統合：
- `snap` → `save`（より良い名前）
- `check` → `status`（より明確）
- `send` → `save`の貼り付けプロンプトに統合
- `plan` → `go`と`save`で自動表示

**Q: 二段階実行とは？**  
A: `kc go`は`claude -c -p "<context>"`で注入後、`claude --continue`でREPLを開く。公式ドキュメント準拠の最も確実な方法。

**Q: なぜトークン%を表示しない？**  
A: Claude CLIはこれを確実に公開していない。代わりにヒューリスティックベースの4値状態（🟢/🟡/🔴/❓）を使用。

**Q: なぜ Git ではなくスナップショットを使うのか？**  
A: Git とスナップショットは補完関係：

| 項目 | Git | KODAMA スナップショット |
|------|-----|----------------------|
| 目的 | コード変更の履歴管理 | 作業コンテキストの保存 |
| 保存内容 | ファイルの差分 | 決定事項、思考過程、次のステップ |
| 使用タイミング | 機能完成時にコミット | 作業中断・再開時 |
| 永続性 | 永久保存 | 作業セッション用（30日で自動アーカイブ） |

**Q: なぜ Node.js ではなく Bun なのか？**  
A: 単一バイナリ配布、高速起動、開発体験が良いから。

**Q: VS Code と統合できるか？**  
A: エディタ非依存。どのエディタでも使える。

**Q: 複数マシンでスナップショットを同期できるか？**  
A: `~/.local/share/kodama-claude` を Git で管理するか、シンボリックリンクを使う。

## ライセンス

MIT

## 作者

機能よりシンプルさを重視する開発者向け。

## サポート

問題発生時の確認順序：

1. `kc status` を実行
2. [GitHub Issues](https://github.com/tsutomu-n/kodama-claude/issues) に報告
3. [詳細ドキュメント](docs/) を参照（英語）

---

**覚えておく**: 最高のツールは「実際に使われる」ツール。KODAMA Claude はそれを目指す。