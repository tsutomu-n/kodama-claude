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

## 使い方

### たった3つのコマンド

```bash
# 1. 作業コンテキストを保存
kc snap

# 2. 前回の続きから再開
kc go

# 3. 次のステップを計画
kc plan
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

### `kc go` - 作業を開始・継続

最新スナップショットを読み込んで Claude Code CLI を起動。

```bash
# シンプルに開始
kc go

# タイトルを付けて開始
kc go -t "ユーザー認証機能の実装"

# 特定のステップから開始
kc go -s implementing
```

**利用可能なステップ**
- `designing` - 設計
- `implementing` - 実装
- `testing` - テスト
- `done` - 完了

### `kc snap` - コンテキストを保存

現在の作業状態をスナップショット化。

```bash
# 対話形式で保存（推奨）
kc snap

# タイトル付きクイック保存
kc snap -t "APIエンドポイント完成"
```

対話形式での入力項目：
1. **タイトル**（短い説明）
2. **ステップ**（現在のフェーズ）
3. **達成したこと**
4. **決定事項**
5. **次のステップ**

### `kc plan` - 作業を計画

次のステップを構造化して計画。

```bash
# 対話形式で計画
kc plan

# タイトル付きで計画
kc plan -t "データベース移行計画"
```

### `kc send` - コンテキストを送信

保存済みコンテキストを既存セッションに送信。

```bash
# 最新スナップショットを送信
kc send

# 特定のスナップショットを送信
kc send <snapshot-id>
```

### `kc doctor` - ヘルスチェック

必要要素の動作確認。

```bash
kc doctor
```

チェック項目
- ✅ KODAMA バイナリ
- ✅ Claude Code CLI
- ✅ ストレージディレクトリ
- ✅ 権限
- ✅ Git

## 日常のワークフロー

### 朝の開始

```bash
# 昨日の作業を確認して継続
kc go
```

### 途中の保存

```bash
# 詳細なスナップショットを作成
kc snap
# タイトル・達成内容・次のステップを入力
```

### 夕方の終了

```bash
# 今日の作業を保存
kc snap -t "本日の作業完了"

# 明日のための計画
kc plan -t "明日のタスク"
```

### 実例：API エンドポイント追加

```bash
# 1. 朝：前回の作業を再開
$ kc go
# → Claude が「認証API設計中、JWT使用、30分有効期限」を認識

# 2. Claude と実装
$ # Claude が前回の決定事項を踏まえて実装を進める

# 3. 作業完了時：スナップショット保存
$ kc snap -t "認証API実装完了"

# 4. Git にコミット（実際のコード変更を記録）
$ git add .
$ git commit -m "feat: Add JWT authentication endpoint"
```

Claude が文脈を理解し、Git がコード変更を追跡。

## 機能

### KODAMA ができること

✅ **アトミックなファイル更新** ― 電源断でも破損しない  
✅ **適切なファイルロック** ― 安全な同時アクセス  
✅ **XDG 準拠** ― Linux ディレクトリ標準に従う  
✅ **依存関係ゼロ** ― 単一バイナリ、npm/pip/cargo 不要  
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

### ストレージ場所

XDG Base Directory 準拠。

```
~/.local/share/kodama-claude/
├── snapshots/          # JSON スナップショット
│   └── archive/        # 30日超の自動アーカイブ
├── events.jsonl        # 追記専用イベントログ
└── .session            # 現在の Claude セッション ID
```

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

**Q: なぜ Claude の `--continue` / `--resume` を使わないのか？**  
A: Claude Code は会話履歴を再開できるが、`/clear` を実行すると**会話履歴**は消える（CLAUDE.md 等の**長期メモリ**は残る）。また、長時間の連続対話で応答品質が不安定になる事例がコミュニティで報告されている。KODAMA は**意思決定・次のステップを構造化して外部に保存**することで、`/clear` やセッション切り替え後でも**人間側の作業文脈**を損なわない。

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

1. `kc doctor` を実行
2. [GitHub Issues](https://github.com/tsutomu-n/kodama-claude/issues) に報告
3. [詳細ドキュメント](docs/) を参照（英語）

---

**覚えておく**: 最高のツールは「実際に使われる」ツール。KODAMA Claude はそれを目指す。