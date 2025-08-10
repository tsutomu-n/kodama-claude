# KODAMA Claude

**日本語** | [English](README.md)

Claude Code CLIのための永続的な対話メモリ拡張ツール

## 理念

> 「少ないことは豊かなこと」 - KODAMAは、Claude Code CLIのためにKODAMAだけができることだけを行います。

KODAMA Claudeは、特定の問題を解決する軽量ツールです：**Claude Code CLIはセッション間でコンテキストを記憶しません**。私たちはこれをたった4つのシンプルなコマンドで解決します。

## クイックスタート

### ワンライナーインストール（Ubuntu/WSL）

```bash
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
```

### 手動インストール

1. お使いのアーキテクチャに応じたバイナリをダウンロード：
   - Linux x64: `kc-linux-x64`
   - Linux ARM64: `kc-linux-arm64`

2. 実行可能にしてPATHに追加：

```bash
chmod +x kc-linux-x64
sudo mv kc-linux-x64 /usr/local/bin/kc
```

## 使い方

### たった3つのコマンド

```bash
# 1. 作業コンテキストを保存
kc snap

# 2. 前回の続きから作業を再開
kc go

# 3. 次のステップを計画
kc plan
```

これだけです。複雑なワークフローも、機能の肥大化も、認知的負荷もありません。

## 日本語サポート

### エラーメッセージの日本語化

環境変数を設定することで、エラーメッセージを日本語で表示できます：

```bash
# 一時的に日本語化
export KODAMA_LANG=ja
kc go

# 永続的に日本語化（~/.bashrcに追加）
echo 'export KODAMA_LANG=ja' >> ~/.bashrc
source ~/.bashrc
```

または、システムのロケール設定が日本語の場合は自動的に日本語表示になります。

## コマンド詳細

### `kc go` - 作業を開始・継続

最新のスナップショットを読み込んでClaude CLIを起動します。

```bash
# シンプルに開始
kc go

# タイトル付きで開始
kc go -t "ユーザー認証機能の実装"

# 特定のステップで開始
kc go -s implementing
```

**利用可能なステップ：**
- `designing` - 設計フェーズ
- `implementing` - 実装フェーズ
- `testing` - テストフェーズ
- `done` - 完了

### `kc snap` - コンテキストを保存

現在の作業状態のスナップショットを作成します。

```bash
# 対話形式で保存（推奨）
kc snap

# タイトル付きでクイック保存
kc snap -t "APIエンドポイント完成"
```

対話形式では以下を入力します：
1. **タイトル** - 短い説明
2. **ステップ** - 現在のフェーズ
3. **達成したこと** - 何を完了したか
4. **決定事項** - 重要な決定
5. **次のステップ** - 次に何をするか

### `kc plan` - 作業を計画

次のステップを構造化して計画します。

```bash
# 対話形式で計画
kc plan

# タイトル付きで計画
kc plan -t "データベース移行計画"
```

### `kc send` - コンテキストを送信

保存されたコンテキストを既存のClaude セッションに送信します。

```bash
# 最新のスナップショットを送信
kc send

# 特定のスナップショットを送信
kc send <snapshot-id>
```

### `kc doctor` - ヘルスチェック

システムが正常に動作しているか確認します。

```bash
kc doctor
```

チェック項目：
- ✅ KODAMAバイナリ
- ✅ Claude CLI
- ✅ ストレージディレクトリ
- ✅ 権限
- ✅ Git

## 日常のワークフロー

### 朝の作業開始

```bash
# 昨日の作業内容を確認して継続
kc go
```

### 作業の保存

```bash
# 詳細なスナップショットを作成
kc snap
# タイトル、達成内容、次のステップを入力
```

### 夕方の作業終了

```bash
# 今日の作業を保存
kc snap -t "本日の作業完了"

# 明日のための計画
kc plan -t "明日のタスク"
```

## 機能

### KODAMAができること

✅ **アトミックなファイル操作** - 電源断でもデータを失わない  
✅ **適切なファイルロック** - 安全な同時アクセス  
✅ **XDG準拠** - Linuxディレクトリ標準を遵守  
✅ **依存関係ゼロ** - 単一バイナリ、npm/pip/cargo不要  
✅ **Git連携** - ブランチとコミットコンテキストを追跡  

### KODAMAができないこと

❌ クラウド同期（Gitを使用してください）  
❌ 複雑なワークフロー（既存のツールを使用してください）  
❌ UI（CLIのみ）  
❌ AI機能（Claudeがそれを行います）  
❌ プロジェクト管理（GitHub/Jiraを使用してください）  

## 技術詳細

### ストレージ場所

XDG Base Directory仕様に従います：

```
~/.local/share/kodama-claude/
├── snapshots/          # JSONスナップショット
├── events.jsonl        # 追記専用イベントログ
└── .session           # 現在のClaudeセッションID
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

### よくある問題と解決方法

| 問題 | 解決方法 |
|------|----------|
| 「kc: コマンドが見つかりません」 | `/usr/local/bin`をPATHに追加 |
| 「権限がありません」 | `sudo chmod +x /usr/local/bin/kc` |
| 「Claude CLIが見つかりません」 | Claude CLIをインストール |
| 「APIキーエラー」 | `export ANTHROPIC_API_KEY="sk-ant-..."` |
| スナップショットを保存できない | `chmod 755 ~/.local/share/kodama-claude` |

### デバッグモード

詳細な情報を表示：

```bash
# デバッグ出力を有効化
KODAMA_DEBUG=1 kc go
```

## ソースからビルド

必要条件：
- Bun >= 1.0.0

```bash
# リポジトリをクローン
git clone https://github.com/tsutomu-n/kodama-claude
cd kodama-claude

# 依存関係をインストール
bun install

# バイナリをビルド
bun run build:all

# バイナリは dist/ に生成されます
ls dist/
```

## 設計原則

1. **ジュニア開発者優先** - 30秒で使えなければ複雑すぎる
2. **一つのことを上手くやる** - Claude対話メモリの永続化、それ以外は何もしない
3. **優雅に失敗する** - すべての操作に複数のフォールバック戦略
4. **ゼロフリクション** - 設定不要、セットアップ不要、すぐに動作

## FAQ

**Q: なぜClaudeの組み込み--continueフラグを使わないのですか？**  
A: コンテキスト構造、決定事項、プロジェクト状態を保持しません。

**Q: なぜNode.jsではなくBunなのですか？**  
A: 単一バイナリ配布、高速起動、優れた開発体験。

**Q: VS Codeと統合できますか？**  
A: KODAMAはエディタに依存しません。どのエディタでも使用できます。

**Q: 複数のマシン間でスナップショットを同期できますか？**  
A: `~/.local/share/kodama-claude`をGitリポジトリに入れるか、シンボリックリンクを使用してください。

## ライセンス

MIT

## 作者

シンプルさを機能よりも重視する開発者のために作られました。

## サポート

問題が発生した場合：

1. `kc doctor`を実行してシステムをチェック
2. [GitHub Issues](https://github.com/tsutomu-n/kodama-claude/issues)で報告
3. [詳細ドキュメント](docs/)を参照（英語）

---

**覚えておいてください**: 最高のツールは実際に使うツールです。KODAMA Claudeはそのツールになるように設計されています。