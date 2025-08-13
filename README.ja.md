# Kodama for Claude Code

[🇯🇵 日本語](README.ja.md) | [🌐 English](README.md)

**Claude Code CLIの非公式拡張** - スマート再開、ワークタグ、ワンキーレジューム機能

> **Claude Code とは**: Anthropic の公式ターミナルAIアシスタント。自然言語でコードを書き、デバッグし、リファクタリングする。`--continue` / `--resume` で会話を再開できるが、**意思決定や次のステップを構造化して保持する仕組みではない**。Kodama がこの問題を解決。

## 始める前に

### 必要なもの

1. **Claude Code** - [公式インストールガイド](https://docs.anthropic.com/en/docs/claude-code/setup)
   ```bash
   # macOS/Linux
   curl -fsSL https://claude.ai/install.sh | bash
   
   # または npm
   npm install -g @anthropic-ai/claude-code
   ```

2. **Linux/WSL環境** - Ubuntu推奨（macOSも可）

3. **基本的なターミナル知識** - cd、ls、catなどの基本コマンド

## 理念

> 「Less is more」 ― Kodama は、Claude Code に対して必要なことだけをやる。

Kodama Claude は **人間の意思決定ログ** を外部に構造化して保存する軽量ツール。`/clear` で会話履歴が消えても、セッションを切り替えても、**作業文脈を損なわない**設計。

## クイックスタート

### ワンライナーインストール（Ubuntu/WSL）

```bash
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
```

> 📌 **重要**: インストールやアップデート時、既存のスナップショットやデータは**完全に保持されます**。  
> データは `~/.local/share/kodama-claude/` に保存され、バイナリ更新時には一切触れられません。

**自動処理内容:**
- 古いバージョン（v0.1.0、v0.2.0）を自動検出・削除
- アーキテクチャに適したバイナリをダウンロード
- SHA256チェックサムを検証
- `/usr/local/bin/kc`にインストール
- 開始する3つのコマンドを表示

### 手動インストール

1. 使用アーキテクチャに合うバイナリをダウンロード
   - Linux x64: `kc-linux-x64`
   - Linux ARM64: `kc-linux-arm64`

2. 実行可能化して PATH に配置

```bash
chmod +x kc-linux-x64
sudo mv kc-linux-x64 /usr/local/bin/kc
```

> **古いバージョンからのアップグレード？** [マイグレーションガイド](docs/ja/migration.md)を参照

## インストール後の最初の10分

### 1. 動作確認

```bash
# Kodamaのバージョン確認
$ kc --version
Kodama for Claude Code 0.4.0

# Claude Codeの確認
$ claude --version
Claude Code version 1.0.x

# Kodamaの状態確認
$ kc status
❓ | basis: no_session | hint: 初回起動時は正常
```

### 2. 初めての起動

```bash
# 最初のセッション開始
$ kc go
# 初回は「前のコンテキストがありません」と表示される（正常）
# Claudeが起動したら、簡単な質問をしてみましょう

> こんにちは、今日は何を作りましょうか？
```

### 3. 最初の保存

```bash
# Claudeを終了（Ctrl+D）してから
$ kc save -t "初回セッション"
# 対話形式で内容を入力
# Enterを2回押すか、Ctrl+D（WSLはCtrl+Z）で入力終了
```

### 4. 作業の再開

```bash
# 次回から前回の内容を引き継げる
$ kc go
# 前回の作業内容が自動的にClaudeに伝わる！
```

💡 **うまくいかない時**: [トラブルシューティング](docs/ja/troubleshooting.md)を参照

## アンインストール

Kodama Claudeは安全でユーザーフレンドリーなアンインストーラーを提供します（デフォルトでデータを保持）。

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

### 手動アンインストール

Kodamaを手動で完全削除する場合：

```bash
# バイナリを削除
sudo rm -f /usr/local/bin/kc

# データディレクトリを削除
rm -rf ~/.local/share/kodama-claude

# 設定ディレクトリも削除（もしあれば）
rm -rf ~/.config/kodama-claude
```

または、uninstallスクリプトを使用：
```bash
# データを保持してバイナリのみ削除
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/uninstall.sh | bash

# すべて削除
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/uninstall.sh | bash -s -- --remove-all
```

## 使い方

### コア3コマンド＋高度な機能

```bash
# コアワークフローコマンド
kc go       # Claudeを起動（健康チェック → 注入 → REPL）
kc save     # スナップショット保存＆貼り付け
kc status   # 健康状態を確認（🟢/🟡/🔴/❓）

# 高度な機能（v0.4.0+）
kc restart  # スマート再開（/clear非依存）
kc tags     # ワークタグ管理
kc resume   # ワンキーレジューム（save + go）
kc list     # 保存済みスナップショットを一覧表示（v0.4.1+）

# スナップショット管理（v0.5.0+）
kc show     # スナップショットの詳細表示
kc delete   # スナップショットの安全な削除（ゴミ箱機能付き）
kc restore  # ゴミ箱から復元（v0.5.1+）
kc search   # スナップショット全文検索

# メンテナンス
kc uninstall # 安全な削除（デフォルトでデータ保持）
```

シンプルなコア、必要時に強力な機能。

## 日本語サポート

### エラーメッセージの日本語化

環境変数で日本語表示。

```bash
# 一時的に日本語化
export Kodama_LANG=ja
kc go

# 永続的に日本語化
# Bash
echo 'export Kodama_LANG=ja' >> ~/.bashrc
source ~/.bashrc

# Zsh
echo 'export Kodama_LANG=ja' >> ~/.zshrc
source ~/.zshrc

# XDG 準拠（systemd 環境）
mkdir -p ~/.config/environment.d
echo 'Kodama_LANG=ja' >> ~/.config/environment.d/kodama.conf
# 再ログインで有効化
```

システムロケールが日本語なら自動検出。

## コマンド概要

Kodama Claudeは**3つのシンプルなコマンド**から始めて、必要な時に強力な機能を提供：

### コアコマンド

**`kc go`** - Claudeセッションを開始  
過去の文脈を自動で引き継いでClaudeを起動

**`kc save`** - 保存＆貼り付け  
作業内容をスナップショットとして保存し、クリップボードへコピー
```bash
kc save --tags "機能,認証"  # ワークタグ付きで保存
```

**`kc status`** - 健康状態確認  
セッションの状態を確認（🟢健康 / 🟡警告 / 🔴危険 / ❓不明）

### 高度な機能（v0.4.0+）

**`kc restart`** - スマート再開  
/clear非依存でコンテキスト保持しながら再開
```bash
kc restart          # コンテキスト付きスマート再開
kc restart --force  # 警告があっても強制再開
```

**`kc tags`** - ワークタグ管理  
インテリジェントタグ機能で作業を整理・フィルタ
```bash
kc tags --list              # 使用回数付きタグ一覧
kc tags --filter "認証,API" # タグでスナップショットをフィルタ
kc tags --stats             # タグ統計表示
kc tags --suggest "機"      # タグ候補（"機能"）
```

**`kc resume`** - ワンキーレジューム  
オプション付き保存で素早く再開（save + go の組み合わせ）
```bash
kc resume                                    # インタラクティブ再開
kc resume -m "認証バグ修正" -t "バグ修正"   # アップデート付きクイック再開
kc resume --no-save                          # 保存せずに再開のみ
```

📚 **[コマンドの詳細な説明はこちら →](docs/ja/command-details.md)**
- 各オプションの意味と使い方
- `--copy`モードの詳細（auto/clipboard/osc52/file/none）
- ワークフローステップの使い分け
- 実践的な使用例

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
▶ Claudeセッションを開始
  1. 健康チェックとスナップショット作成
  2. -c -p でコンテキスト注入
  3. --continue でREPL開始

🟢 セッション状態: 健康
📸 最後のスナップショット: 2時間前
📤 コンテキストを注入中...
✅ コンテキスト注入成功
🚀 Claude REPLを開いています...

# 2. Claude と対話（インタラクティブセッション）

# 3. 進捗を保存
$ kc save -t "認証API完了"
📝 作業内容を保存
[対話形式のプロンプト...]
[Y/n] クリップボードに貼り付けますか？ y
✅ クリップボードにコピーしました

# 4. いつでも状態確認
$ kc status
🟡 | basis: heuristic | hint: 保存を推奨
```

### 各コマンドの使い時

- **`kc go`**: 一日の始まりや作業再開（全自動）
- **`kc save`**: 休憩前、タスク切り替え、または促された時
- **`kc status`**: 健康状態の確認（CI/CDでは--strict付き）

Claude が文脈を理解し、Git がコード変更を追跡。

## 新機能: スナップショット管理（v0.5.0）

### スナップショットの確認 - `kc show`

**基本的な使い方**
```bash
# 最新のスナップショットを確認
kc show latest

# 特定のスナップショットを表示（部分IDマッチング）
kc show abc123  # 完全なUUIDを入力する必要なし

# 詳細な内容を表示（長いコンテキストも全て表示）
kc show abc123 --verbose

# スクリプト用のJSON出力
kc show abc123 --json
```

**ジュニアSE向け使用例**
```bash
# 🔰 新人研修例：昨日の作業内容を確認
# 1. 最新の作業を確認
$ kc show latest
📸 スナップショット: ユーザー認証機能の実装
📅 作成日時: 8月12日 17:30 (19時間前)
📊 ステップ: implementing
🏷️  タグ: auth, backend

📝 達成内容:
・JWTトークンの生成と検証機能を実装
・ユーザーの新規登録とログイン処理を作成
・パスワードハッシュ化にbcryptを使用

💡 決定事項:
・アクセストークンの有効期限は30分に設定
・リフレッシュトークンは7日間有効とする

⚡ 次のステップ:
・ログアウト機能の実装
・トークン自動更新機能の追加
・単体テストの作成

# 2. より詳しい内容が知りたい場合
$ kc show abc123 --verbose
# 完全なコンテキストを表示（途中で省略されない）
```

### スナップショットの削除 - `kc delete`

**基本的な使い方**
```bash
# 単一スナップショットの削除（ゴミ箱に移動）
kc delete abc123

# 複数スナップショットをまとめて削除
kc delete abc123 def456 ghi789

# 古いスナップショットを一括削除
kc delete --older-than 7d    # 7日より古いもの
kc delete --older-than 2w    # 2週間より古いもの
kc delete --older-than 1m    # 1ヶ月より古いもの

# ゴミ箱の内容を確認
kc delete --list-trash

# ゴミ箱から復元
kc delete --restore abc123
# または復元専用コマンド（v0.5.1+）
kc restore abc123

# ゴミ箱を空にする
kc delete --empty-trash
```

**ジュニアSE向け使用例**
```bash
# 🔰 新人研修例：プロジェクト完了後のクリーンアップ
# 1. 現在のスナップショットを確認
$ kc list -n 10
📚 最近のスナップショット (3/3件を表示):

1. プロジェクト完了報告
   📅 8月13日 18:00 (1時間前)
   📊 ステップ: done

2. テスト実装
   📅 8月13日 16:30 (3時間前) 
   📊 ステップ: testing

3. 実験的な実装（失敗）
   📅 8月13日 10:00 (9時間前)
   📊 ステップ: implementing

# 2. 失敗した実験的な実装を削除
$ kc delete c4d56789  # 部分IDで指定
✅ スナップショット 'c4d56789...' をゴミ箱に移動しました

# 3. 間違えて削除した場合は復元可能
$ kc restore c4d56789
✅ スナップショット 'c4d56789...' をゴミ箱から復元しました

# 4. 1週間以上前の作業用スナップショットを一括削除
$ kc delete --older-than 1w
⚠️  7件のスナップショットが削除対象です:
- "初期調査メモ" (8月5日)
- "環境構築試行錯誤" (8月6日)
...
[y/N] 削除しますか？ y
✅ 7件のスナップショットをゴミ箱に移動しました
```

### スナップショットの検索 - `kc search`

**基本的な使い方**
```bash
# タイトルのみで検索（高速）
kc search "認証機能"

# 全文検索（コンテキストや決定事項も含む）
kc search "JWT" --full-text

# タグで検索
kc search --tags "auth,backend"

# 正規表現検索（高度）
kc search "API.*エンドポイント" --regex

# 期間を指定して検索
kc search "バグ修正" --since "1w"  # 1週間以内
kc search "機能" --until "2d"       # 2日前まで

# JSON出力（スクリプト用）
kc search "認証" --json
```

**ジュニアSE向け使用例**
```bash
# 🔰 新人研修例：過去の作業から学習
# 1. 認証関連の作業を探す
$ kc search "認証"
🔍 検索結果: "認証" (2件見つかりました)

1. ユーザー認証機能の実装
   📅 8月12日 17:30 (関連度: 95%)
   📊 ステップ: implementing
   🏷️  タグ: auth, backend
   
   💡 ハイライト: "ユーザー認証機能を実装し、JWTトークンの..."

2. 認証エラーハンドリング改善
   📅 8月10日 14:20 (関連度: 87%)
   📊 ステップ: done
   🏷️  タグ: auth, bugfix

# 2. より具体的に検索（全文検索）
$ kc search "JWT" --full-text
🔍 検索結果: "JWT" (3件見つかりました)

1. ユーザー認証機能の実装
   💬 決定事項: "JWTトークンの有効期限は30分に設定"
   💬 コンテキスト: "...JWT実装でRS256アルゴリズムを選択..."

# 3. 特定の期間の作業を検索
$ kc search "バグ修正" --since "1w"
🔍 過去1週間の "バグ修正" (1件見つかりました)

1. ログインタイムアウトバグ修正
   📅 8月11日 09:15
   🏷️  タグ: bugfix, auth

# 4. 複数のタグで絞り込み検索
$ kc search --tags "backend,api"
🔍 タグ検索: backend,api (4件見つかりました)
...
```

### 拡張された一覧表示 - `kc list`

**新しいフィルター機能**
```bash
# 今日の作業のみ表示
kc list --today

# 昨日の作業を確認
kc list --yesterday

# 今週の作業をまとめて確認
kc list --this-week

# 特定の期間の作業
kc list --since "3d"        # 3日前から
kc list --until "1w"        # 1週間前まで
kc list --since "2024-08-10" --until "2024-08-12"

# タグでフィルタ
kc list --tags "auth"       # 認証関連の作業のみ
kc list --tags "auth,api"   # 認証またはAPI関連

# 並び順を変更
kc list --sort title        # タイトル順
kc list --sort step         # ステップ順
kc list --reverse           # 逆順表示
```

**ジュニアSE向け使用例**
```bash
# 🔰 新人研修例：日次・週次レビュー
# 1. 今日の作業を振り返り
$ kc list --today
📚 今日のスナップショット (3件を表示):

1. 単体テスト追加
   📅 8月13日 16:45 (2時間前)
   📊 ステップ: testing
   🏷️  タグ: test, auth

2. 認証APIエンドポイント実装
   📅 8月13日 14:20 (4時間前)
   📊 ステップ: implementing
   🏷️  タグ: api, auth

3. 朝会メモ
   📅 8月13日 09:00 (9時間前)
   📊 ステップ: designing

# 2. 週報の準備
$ kc list --this-week --tags "backend"
📚 今週のバックエンド作業:
...

# 3. 特定の機能開発の履歴を確認
$ kc list --tags "auth" --sort date
📚 認証機能の開発履歴:
1. 認証の初期調査 (8月8日)
2. JWT実装開始 (8月9日)  
3. 認証テスト追加 (8月10日)
4. 認証完了 (8月12日)
```

## 機能

### Kodama ができること

✅ **セッション健康追跡** ― トークン使用量の監視と警告  
✅ **自動保護** ― コンテキスト危険時の自動スナップショット  
✅ **スマート再開** ― /clear非依存でコンテキスト保持しながら再開  
✅ **ワークタグ** ― インテリジェントタグ機能とサジェスト機能でスナップショット整理  
✅ **ワンキーレジューム** ― クイック再開ワークフロー（save + go を1コマンドで）  
✅ **アトミックなファイル更新** ― 電源断でも破損しない  
✅ **適切なファイルロック** ― 安全な同時アクセス  
✅ **XDG 準拠** ― Linux ディレクトリ標準に従う  
✅ **単一バイナリ** ― コア機能は実行時依存なし  
✅ **Git 連携** ― ブランチとコミットの文脈を追跡  
✅ **スマートなコンテキスト管理** ― 決定事項を最新5件に自動制限  
✅ **自動アーカイブ** ― 30日超のスナップショットを整理  
✅ **CLAUDE.md 連携** ― AI コンテキストを自動同期（オプトイン）  

### Kodama がやらないこと

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

> 💡 **注**: Kodama はこれらのパッケージなしでも動作します。利用できない場合は以下にフォールバック:
> - OSC52 ターミナルクリップボードプロトコル
> - コンテキスト渡し用の一時ファイル
> - 通知の代わりにコンソール出力

### ストレージ場所

XDG Base Directory 準拠。

```
~/.local/share/kodama-claude/
├── snapshots/          # JSON スナップショット（各1-2KB）
│   └── archive/        # 30日超の自動アーカイブ
├── events.jsonl        # 追記専用イベントログ
└── .session            # 現在の Claude セッション ID
```

**ストレージ使用量**: 年間約5-15 MB。詳細は[ストレージ管理](docs/ja/storage-management.md)を参照。

### ファイルパーミッション

Kodama はセキュリティベストプラクティスに従ったパーミッション設定：

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
export Kodama_NO_LIMIT=true        # すべての決定事項を表示（デフォルト: 5件のみ）
export Kodama_AUTO_ARCHIVE=false   # 自動アーカイブを無効化
export Kodama_ARCHIVE_DAYS=14      # 14日後にアーカイブ（デフォルト: 30）
export Kodama_MAX_DECISIONS=10     # 10件の決定事項を保持（デフォルト: 5）
export Kodama_CLAUDE_SYNC=true     # CLAUDE.md 自動更新を有効化
export Kodama_DEBUG=true           # デバッグ出力を有効化
export Kodama_LANG=ja              # 日本語エラーメッセージ
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
  "gitCommit": "abc123",
  "tags": ["機能", "認証", "API"]
}
```

## 最新情報

### v0.5.0 (2025-08-13)
- **新コマンド `kc show`** - スナップショットの詳細表示（部分IDマッチング、JSON出力対応）
- **新コマンド `kc delete`** - 安全な削除機能（ゴミ箱・復元機能付き、古いスナップショット一括削除）
- **新コマンド `kc search`** - 全文検索機能（タイトル・全文・タグ・正規表現検索、期間フィルタ）
- **`kc list` 拡張** - 日時フィルタ（今日・昨日・今週）、タグフィルタ、並び替え機能
- **セキュリティ強化** - 全コマンドで包括的なセキュリティ対策（DoS保護、入力検証、制御文字除去）

### v0.4.1 (2025-08-13)
- **新コマンド `kc list`** - 保存されたスナップショットをタイトル、時刻、タグ付きで表示
- **セキュリティ強化** - パストラバーサル防止とDoS保護を含む8件のセキュリティ修正
- **パフォーマンス改善** - 1000件制限付きの最適化されたファイル処理

### v0.4.0 (2025-08-12)
- **スマート再開** - /clearコマンドに依存しない文脈保持
- **ワークタグ** - セマンティックタグで作業を整理・検索
- **ワンキーレジューム** - save + restartを統合した高速イテレーション

完全なリリース履歴は[CHANGELOG.md](CHANGELOG.md)をご覧ください。

## トラブルシューティング

### よくある問題と解決

| 問題 | 解決 |
|------|------|
| `kc: コマンドが見つかりません` | `/usr/local/bin` を PATH に追加 |
| `権限がありません` | `sudo chmod +x /usr/local/bin/kc` |
| `Claude Code が見つかりません` | [Claude Code をインストール](https://docs.anthropic.com/en/docs/claude-code/setup) |
| `認証が必要` | `claude` で OAuth 認証（ブラウザが開きます） |
| スナップショット保存に失敗 | `chmod 755 ~/.local/share/kodama-claude` |
| `unknown option '--system'` | 古いv0.1.0がインストールされている → [再インストール手順](#v010からのアップグレード) |

### エラーが出たら

1. **まずは状態確認**
   ```bash
   kc status
   ```

2. **Claude Codeの確認**
   ```bash
   claude --version
   claude doctor  # 診断ツール
   ```

3. **詳しいヘルプ**
   - 📚 [詳細なトラブルシューティングガイド](docs/troubleshooting.md)
   - 💬 [GitHub Issues](https://github.com/tsutomu-n/kodama-claude/issues)

### デバッグモード

詳細情報を出力。

```bash
# デバッグ出力を有効化
Kodama_DEBUG=1 kc go
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
A: Claude Codeはこれを確実に公開していない。代わりにヒューリスティックベースの4値状態（🟢/🟡/🔴/❓）を使用。

**Q: なぜ Git ではなくスナップショットを使うのか？**  
A: Git とスナップショットは補完関係：

| 項目 | Git | Kodama スナップショット |
|------|-----|----------------------|
| 目的 | コード変更の履歴管理 | 作業コンテキストの保存 |
| 保存内容 | ファイルの差分 | 決定事項、思考過程、次のステップ |
| 使用タイミング | 機能完成時にコミット | 作業中断・再開時 |
| 永続性 | 永久保存 | 作業セッション用（30日で自動アーカイブ） |

**Q: なぜ Node.js ではなく Bun なのか？**  
A: 単一バイナリ配布、高速起動、開発体験が良いから。

**Q: VS Code と統合できるか？**  
A: エディタ非依存。どのエディタでも使える。

**Q: インストール/アップデート時にスナップショットは削除されますか？**  
A: いいえ。Kodama Claudeは設計上、インストールやアップデート時にユーザーデータに一切触れません。すべてのスナップショットは `~/.local/share/kodama-claude/` に安全に保存され、バイナリ更新の影響を受けません。データ削除には `kc uninstall --remove-all` の明示的なコマンドが必要です。

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

**覚えておく**: 最高のツールは「実際に使われる」ツール。Kodama Claude はそれを目指す。