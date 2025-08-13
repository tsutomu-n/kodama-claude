# KODAMA Claude コマンド詳細ガイド

🟢 **難易度**: 初級〜中級 | **読了時間**: 15分

このガイドでは、KODAMA Claudeの全コマンドについて、オプションや動作を詳しく説明します。v0.5.0で新しく追加されたスナップショット管理機能も含みます。

## 目次
- [用語説明](#用語説明)
- [kc go - セッション開始コマンド](#kc-go---セッション開始コマンド)
- [kc save - 保存＆貼り付けコマンド](#kc-save---保存貼り付けコマンド)
- [kc status - 健康状態確認コマンド](#kc-status---健康状態確認コマンド)
- [kc list - スナップショット一覧表示](#kc-list---スナップショット一覧表示)
- [kc show - スナップショット詳細表示（v0.5.0+）](#kc-show---スナップショット詳細表示v050)
- [kc delete - スナップショット削除（v0.5.0+）](#kc-delete---スナップショット削除v050)
- [kc search - スナップショット検索（v0.5.0+）](#kc-search---スナップショット検索v050)
- [実践的な使用例](#実践的な使用例)

## 用語説明

初めての方向けに、よく出てくる用語を説明します：

| 用語 | 意味 | 例 |
|------|------|-----|
| **REPL** | Read-Eval-Print Loop の略。対話型のコマンドライン環境 | Claudeとの対話画面 |
| **コンテキスト** | 過去の作業内容や決定事項 | 「昨日はログイン機能を実装した」 |
| **コンテキスト注入** | 過去の作業内容をClaudeに伝える処理 | `claude -c -p "内容"` |
| **スナップショット** | ある時点の作業状態の保存 | 「ログイン機能完成時点の記録」 |
| **セッション** | Claudeとの一連の対話 | 朝から夕方までの作業 |
| **ワークフローステップ** | 作業の段階 | 設計→実装→テスト→完了 |
| **EOF** | End Of File。入力の終了を示す | Ctrl+D または Ctrl+Z |

## `kc go` - セッション開始コマンド

### 基本的な動作の流れ

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 1. 健康確認 │ --> │ 2. 注入     │ --> │ 3. REPL起動 │
│  (自動保護) │     │ (過去の文脈)│     │  (対話開始) │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. **健康チェックと自動保護**
   - メモリ使用状況を確認
   - 危険な状態なら自動でスナップショット作成
   - 状態表示: 🟢（健康）🟡（警告）🔴（危険）

2. **コンテキスト注入** (`claude -c -p`)
   - 過去のスナップショットから文脈を読み込み
   - Claudeに「何をやっていたか」を伝える
   - 決定事項や次のステップも含む

3. **REPL起動** (`claude --continue`)
   - 対話型セッションを開始
   - 前回の続きから作業再開
   - Ctrl+D（またはCtrl+Z）で終了

### オプション詳細

#### `-t, --title <title>` - セッションタイトル

**用途**: 作業内容に名前を付ける

```bash
# 例：新機能の開発
kc go -t "ユーザー認証機能の実装"

# 例：バグ修正
kc go -t "ログイン画面のバグ修正"
```

**メリット**:
- 後で振り返りやすい
- チームメンバーと共有時に分かりやすい
- スナップショットの整理に便利

#### `-s, --step <step>` - ワークフローステップ

**用途**: 現在の作業段階を記録

| ステップ | 意味 | 使うタイミング |
|---------|------|--------------|
| `designing` | 設計中 | 機能の仕様を考えている時 |
| `implementing` | 実装中 | コードを書いている時 |
| `testing` | テスト中 | 動作確認やバグ修正時 |
| `done` | 完了 | 機能が完成した時 |

```bash
# 設計段階
kc go -s designing -t "API設計"

# 実装段階
kc go -s implementing -t "APIエンドポイント実装"

# テスト段階
kc go -s testing -t "API統合テスト"
```

#### `--no-send` - コンテキスト注入をスキップ

**用途**: 健康チェックのみ実行（Claudeは起動しない）

```bash
# 状態確認だけしたい時
kc go --no-send

# 出力例：
# 🟢 Session status: healthy
# 📸 Last snapshot: 2h ago
# ℹ️ Skipping context injection (--no-send flag)
```

## `kc save` - 保存＆貼り付けコマンド

### 基本的な動作

1. 作業内容を入力（対話形式）
2. スナップショットとして保存
3. クリップボードへの貼り付けを提案

### オプション詳細

#### `--copy <mode>` - コピーモードの選択

クリップボードへのコピー方法を指定します：

| モード | 説明 | 使用場面 | 必要なもの |
|--------|------|----------|-----------|
| `auto` | 自動選択（推奨） | 通常はこれで OK | なし |
| `clipboard` | システムクリップボード | ローカル作業時 | xclip/pbcopy |
| `osc52` | ターミナルプロトコル | SSH接続時 | 対応ターミナル |
| `file` | 一時ファイル経由 | 確実にコピーしたい時 | なし |
| `none` | コピーしない | 保存のみしたい時 | なし |

```bash
# 自動選択（推奨）
kc save --copy auto

# SSH経由で作業している場合
kc save --copy osc52

# コピー不要な場合
kc save --copy none
```

**OSC52とは？**
- ターミナルのエスケープシーケンスを使用
- SSH経由でもローカルのクリップボードにコピー可能
- iTerm2、Windows Terminal、最新のgnome-terminalで対応

#### `--stdin` - 標準入力から読み込み

**用途**: スクリプトやパイプラインで使用

```bash
# gitのログを保存
git log --oneline -10 | kc save --stdin -t "今週の作業"

# コマンドの出力を保存
echo "デプロイ完了" | kc save --stdin -y

# ファイルの内容を保存
cat progress.txt | kc save --stdin
```

#### `--file <path>` - ファイルから読み込み

**用途**: 準備済みのテキストファイルから読み込む

```bash
# 事前に作成したメモから
kc save --file ~/work-notes.txt

# マークダウンファイルから
kc save --file ./docs/decisions.md -t "設計決定"
```

#### `-y, --yes` - 確認をスキップ

**用途**: 自動化やスクリプト内で使用

```bash
# 確認なしで保存
echo "自動保存" | kc save --stdin -y

# cronジョブで使用
0 * * * * echo "定期保存" | kc save --stdin -y -t "自動バックアップ"
```

### 対話モードの詳細

デフォルトでは、以下の項目を対話的に入力：

1. **タイトル** - この作業の名前
2. **ステップ** - designing/implementing/testing/done
3. **達成内容** - 何を完了したか
4. **決定事項** - どんな判断をしたか
5. **次のステップ** - 次に何をするか

**入力の終了方法**:
- **Unix/Mac**: Ctrl+D
- **WSL（Windows）**: Ctrl+Z
- **共通**: Enterを2回押す（空行で終了）

## `kc status` - 健康状態確認コマンド

### 出力の読み方

```
🟢 | basis: transcript | hint: no action needed
```

| 部分 | 意味 | 例 |
|------|------|-----|
| 絵文字 | 健康状態 | 🟢=健康、🟡=警告、🔴=危険、❓=不明 |
| basis | 判定根拠 | transcript=正確、heuristic=推定、no_session=データなし |
| hint | 推奨アクション | "no action needed"、"save recommended" |

### オプション詳細

#### `-j, --json` - JSON形式で出力

**用途**: スクリプトやツールで処理する場合

```bash
# JSON出力
kc status --json

# 出力例：
{
  "level": "healthy",
  "basis": "transcript",
  "lastSnapshot": {
    "id": "abc123",
    "title": "ログイン機能実装",
    "ageHours": 2.5
  },
  "suggestion": "作業を続けてください"
}

# jqで特定の値を取得
kc status --json | jq -r '.level'
# 出力: healthy
```

#### `-s, --strict` - 厳格モード

**用途**: CI/CDパイプラインで使用

```bash
# 危険な状態ならexit code 1を返す
if ! kc status --strict; then
  echo "コンテキストが危険！保存が必要"
  kc save -t "CI自動保存"
fi
```

## 実践的な使用例

### シナリオ1: 朝の作業開始

```bash
# 1. 昨日の続きから開始
kc go -t "API実装の続き"

# Claudeが応答：
# 「昨日はユーザー認証APIを実装中でしたね。
#  JWTトークンの有効期限を30分に設定することに決めました。
#  今日はリフレッシュトークンの実装から始めましょう」

# 2. 作業を進める...

# 3. 休憩前に保存
kc save -t "リフレッシュトークン実装完了"
```

### シナリオ2: SSH経由での作業

```bash
# リモートサーバーにSSH接続中
ssh user@server

# OSC52プロトコルでクリップボードにコピー
kc save --copy osc52

# ローカルマシンのクリップボードに内容がコピーされる
```

### シナリオ3: 定期的な自動保存

```bash
# crontabに追加
crontab -e

# 2時間ごとに自動保存
0 */2 * * * cd ~/project && echo "定期保存 $(date)" | kc save --stdin -y -t "自動保存"
```

### シナリオ4: CI/CDパイプライン

```yaml
# .github/workflows/check.yml
steps:
  - name: Check KODAMA status
    run: |
      # 状態確認
      STATUS=$(kc status --json | jq -r '.level')
      
      # 危険なら保存
      if [ "$STATUS" = "danger" ]; then
        echo "ビルド前チェックポイント" | kc save --stdin -y
      fi
      
      # 厳格チェック
      kc status --strict
```

## トラブルシューティング

### クリップボードが動作しない

```bash
# 1. 利用可能な方法を確認
kc save --copy clipboard  # システムクリップボード試行
kc save --copy osc52      # ターミナルプロトコル試行
kc save --copy file       # ファイル経由（最も確実）

# 2. 必要なツールをインストール
# Ubuntu/Debian
sudo apt install xclip

# macOS（既にpbcopyがある）
# Windows WSL（clip.exeが使える）
```

### EOFの入力方法が分からない

| 環境 | 方法 | 補足 |
|------|------|------|
| Linux/Mac ターミナル | Ctrl+D | 標準的な方法 |
| Windows WSL | Ctrl+Z | Windowsの仕様 |
| どの環境でも | Enter 2回 | 空行で終了 |

### ワークフローステップの選び方

```bash
# プロジェクト開始時
kc go -s designing    # 仕様を考える

# コーディング開始
kc go -s implementing # 実装する

# 動作確認
kc go -s testing      # テストする

# 完成
kc save -s done       # 完了を記録
```

## まとめ

KODAMA Claudeの3つのコマンドは、シンプルに見えて豊富なオプションを持っています：

1. **`kc go`** - 作業を開始・再開（文脈を自動で引き継ぐ）
2. **`kc save`** - 進捗を保存（様々な方法でコピー可能）
3. **`kc status`** - 健康状態を確認（自動化にも対応）

### 高度な機能 (v0.4.0+)
4. **`kc restart`** - スマート再起動（文脈を保持）
5. **`kc tags`** - インテリジェントなワークタグ管理
6. **`kc resume`** - ワンキー再開（save + go を統合）
7. **`kc list`** - 保存されたスナップショットを一覧表示 (v0.4.1+)

最初は基本的な使い方から始めて、慣れてきたらオプションを活用してください。

## kc list

**目的**: 保存されたスナップショットの一覧を表示して、作業履歴を確認します。

### 基本的な使い方

```bash
# 最新10件のスナップショットを表示（デフォルト）
kc list

# より多くのスナップショットを表示
kc list -n 20
kc list --limit 50

# スクリプト用にJSON出力
kc list --json

# IDとファイル名を含む詳細表示
kc list --verbose
kc list -v
```

### 出力形式

#### 標準出力
```
📚 最近のスナップショット (3/3件を表示):

1. ユーザー認証を実装
   📅 8月13日 14:30 (2時間前)
   📊 ステップ: testing
   🏷️  タグ: auth, backend

2. ログインタイムアウトバグを修正
   📅 8月13日 10:15 (6時間前)
   📊 ステップ: done

3. 朝会メモ
   📅 8月13日 09:00 (7時間前)
```

#### 詳細出力（Verbose）
```
📚 最近のスナップショット (3/3件を表示):

1. ユーザー認証を実装
   📅 8月13日 14:30 (2時間前)
   📊 ステップ: testing
   🏷️  タグ: auth, backend
   🆔 ID: abc123def456
   📁 ファイル: 2025-08-13T14-30-00-abc123.json
```

#### JSON出力
```json
{
  "snapshots": [
    {
      "id": "abc123def456",
      "title": "ユーザー認証を実装",
      "timestamp": "2025-08-13T14:30:00Z",
      "step": "testing",
      "tags": ["auth", "backend"],
      "file": "2025-08-13T14-30-00-abc123.json"
    }
  ]
}
```

### オプション

#### `-n, --limit <数値>` - 結果数の制限

表示するスナップショット数を制御:

```bash
# 最新5件のスナップショットを表示
kc list -n 5

# 最新100件のスナップショットを表示
kc list --limit 100
```

**注意**: パフォーマンスのため、最大制限は1000件です。

#### `--json` - JSON出力

スクリプト用にJSON形式で出力:

```bash
# すべてのスナップショットのタイトルを取得
kc list --json | jq -r '.snapshots[].title'

# 特定のタグを持つスナップショットを検索
kc list --json | jq '.snapshots[] | select(.tags | contains(["auth"]))'

# スナップショットの総数をカウント
kc list --json | jq '.snapshots | length'
```

#### `-v, --verbose` - 詳細モード

スナップショットIDとファイル名を含む追加詳細を表示:

```bash
kc list --verbose

# 以下の用途に便利:
# - デバッグ
# - 特定のスナップショットファイルの検索
# - スナップショットIDの確認
```

### 実用例

#### 今日の作業をレビュー
```bash
# 最近の作業をリスト
kc list -n 20

# 今朝取り組んでいた内容を確認
kc list --json | jq '.snapshots[] | select(.timestamp | startswith("2025-08-13"))'
```

#### 特定の作業を検索
```bash
# タイトルで検索（grepを使用）
kc list --json | jq -r '.snapshots[] | "\(.title) - \(.timestamp)"' | grep -i "認証"

# タグで検索
kc list --json | jq '.snapshots[] | select(.tags | contains(["backend"]))'
```

#### 作業レポートを生成
```bash
# シンプルな作業レポートを作成
echo "## 作業レポート - $(date +%Y-%m-%d)" > report.md
echo "" >> report.md
kc list --json | jq -r '.snapshots[] | "- \(.title) (\(.step))"' >> report.md
```

#### 古いスナップショットをクリーンアップ
```bash
# 7日以上前のスナップショットをリスト（削除前の確認用）
kc list --json | jq '.snapshots[] | select(
  (now - (.timestamp | fromdate)) > (7 * 24 * 3600)
) | .file'
```

### セキュリティ機能

`kc list`コマンドには複数のセキュリティ対策が含まれています：

- **パストラバーサル保護**: 有効なスナップショットファイルのみ処理
- **DoS保護**: 一度に最大1000件までしかリストできません
- **ファイルサイズ制限**: 10MBより大きいファイルはスキップ
- **制御文字フィルタリング**: 出力から制御文字を除去
- **安全なエラーメッセージ**: サニタイズされたエラーメッセージで情報漏洩を防止

### 新機能（v0.5.0+）: 高度なフィルタと並び替え

#### 時間ベースフィルタ

```bash
# 今日の作業のみ表示
kc list --today

# 昨日の作業を確認
kc list --yesterday

# 今週の作業をまとめて表示
kc list --this-week

# 特定の期間を指定
kc list --since "3d"         # 3日前から
kc list --until "1w"         # 1週間前まで
kc list --since "2025-08-10" --until "2025-08-12"
```

#### タグフィルタ

```bash
# 特定のタグで絞り込み
kc list --tags "auth"        # 認証関連のみ
kc list --tags "auth,api"    # 認証またはAPI関連
kc list --tags "backend+auth" # バックエンドかつ認証関連
```

#### 並び替えオプション

```bash
# 様々な並び順
kc list --sort date          # 日付順（デフォルト）
kc list --sort title         # タイトル順
kc list --sort step          # ワークフローステップ順
kc list --sort tags          # タグ順

# 逆順表示
kc list --reverse            # 古い順に表示
kc list --sort title --reverse # タイトル逆順
```

#### 実用例：プロジェクト進捗レビュー

```bash
# 今週の認証機能開発の進捗を確認
$ kc list --this-week --tags "auth" --sort date
📚 今週の認証関連作業 (4件を表示):

1. 認証設計の検討
   📅 8月10日 09:30 (3日前)
   📊 ステップ: designing
   🏷️  タグ: auth, design

2. JWT実装開始
   📅 8月11日 14:20 (2日前)
   📊 ステップ: implementing
   🏷️  タグ: auth, backend

3. 認証テスト追加
   📅 8月12日 11:00 (1日前)
   📊 ステップ: testing
   🏷️  タグ: auth, test

4. 認証機能完了
   📅 8月13日 16:45 (今日)
   📊 ステップ: done
   🏷️  タグ: auth, backend

# 週報用にJSON形式で出力
$ kc list --this-week --tags "auth" --json | jq -r '.snapshots[] | "- \(.title) (\(.step))"'
- 認証設計の検討 (designing)
- JWT実装開始 (implementing)
- 認証テスト追加 (testing)
- 認証機能完了 (done)
```

## `kc show` - スナップショット詳細表示（v0.5.0+）

**目的**: 保存されたスナップショットの詳細内容を表示して、過去の作業を確認します。

### 基本的な使い方

```bash
# 最新のスナップショットを表示
kc show latest

# 特定のスナップショットを表示（部分IDマッチング）
kc show abc123    # 完全なUUIDを入力する必要なし

# 詳細モード（コンテキストを完全表示）
kc show abc123 --verbose
kc show abc123 -v

# JSON出力（スクリプト用）
kc show abc123 --json
```

### オプション詳細

#### 部分IDマッチング

**概要**: UUIDの最初の数文字だけで検索可能

```bash
# 完全なUUID: 550e8400-e29b-41d4-a716-446655440000
# 以下のどれでも同じスナップショットを表示
kc show 550e8400
kc show 550e8400-e29b
kc show 550e8400-e29b-41d4

# 注意：曖昧な場合はエラー
kc show 5    # 複数のスナップショットが "5" で始まる場合
```

#### `--verbose` / `-v` - 詳細モード

**デフォルト**: コンテキストが200文字を超える場合は省略  
**詳細モード**: 完全なコンテキストを表示

```bash
# 通常表示（200文字で省略）
$ kc show abc123
📝 達成内容:
長いコンテキストの内容がここに表示されます。しかし200文字を超える場合は省略され...
（Context truncated. Use --verbose to see full content）

# 詳細表示（完全なコンテキスト）
$ kc show abc123 --verbose
📝 達成内容:
長いコンテキストの内容がここに完全に表示されます。何千文字でも省略されずに全て表示されるので、詳細な作業内容を確認する際に便利です。過去の複雑な実装の詳細や、長い調査結果なども完全に読み返すことができます...
```

#### `--json` - JSON出力

**用途**: スクリプトやツールでの処理

```bash
# JSON形式で出力
$ kc show abc123 --json
{
  "snapshot": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "actualId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "ユーザー認証実装",
    "timestamp": "2025-08-13T14:30:00Z",
    "step": "implementing",
    "context": "JWT認証を実装しました...",
    "decisions": ["アクセストークン30分", "リフレッシュトークン7日"],
    "nextSteps": ["テスト追加", "ログアウト機能"],
    "tags": ["auth", "backend"],
    "cwd": "/home/user/project",
    "gitBranch": "feature/auth"
  }
}

# jqで特定の情報を抽出
kc show abc123 --json | jq -r '.snapshot.title'
# 出力: ユーザー認証実装

kc show abc123 --json | jq -r '.snapshot.decisions[]'
# 出力: アクセストークン30分
#       リフレッシュトークン7日
```

### 実用例

#### 昨日の作業内容を詳細確認

```bash
# 1. 最新のスナップショットをざっと確認
$ kc show latest
📸 スナップショット: API実装完了
📅 作成日時: 8月12日 18:30 (14時間前)
📊 ステップ: done

# 2. もっと詳しく知りたい場合
$ kc show latest --verbose
# → 完全なコンテキストが表示される

# 3. スクリプトで処理したい場合
$ kc show latest --json | jq -r '.snapshot.nextSteps[]'
# → 次のステップのリストを取得
```

## `kc delete` - スナップショット削除（v0.5.0+）

**目的**: 不要なスナップショットを安全に削除します。ゴミ箱機能により、誤削除からも保護されます。

### 基本的な使い方

```bash
# 単一スナップショットの削除
kc delete abc123

# 複数スナップショットを一度に削除
kc delete abc123 def456 ghi789

# 古いスナップショットを一括削除
kc delete --older-than 7d     # 7日より古い
kc delete --older-than 2w     # 2週間より古い
kc delete --older-than 1m     # 1ヶ月より古い

# ゴミ箱管理
kc delete --list-trash        # ゴミ箱の内容を表示
kc delete --restore abc123    # ゴミ箱から復元
kc delete --empty-trash       # ゴミ箱を空にする
```

### オプション詳細

#### `--older-than <期間>` - 期間指定削除

**期間指定の形式**:

| 形式 | 意味 | 例 |
|------|------|-----|
| `Nd` | N日前 | `7d` = 7日前 |
| `Nw` | N週前 | `2w` = 2週間前 |
| `Nm` | Nヶ月前 | `1m` = 1ヶ月前 |
| `Ny` | N年前 | `1y` = 1年前 |

```bash
# プロジェクト終了後のクリーンアップ
$ kc delete --older-than 2w
⚠️  12件のスナップショットが削除対象です:
- "初期調査" (7月28日)
- "環境構築メモ" (7月29日)
- "実験的実装" (8月1日)
...

削除対象の詳細:
📊 ステップ別内訳:
  - designing: 4件
  - implementing: 6件
  - testing: 2件

🏷️  タグ別内訳:
  - research: 3件
  - experiment: 5件
  - draft: 4件

[y/N] これらのスナップショットを削除しますか？ y
✅ 12件のスナップショットをゴミ箱に移動しました
```

#### ゴミ箱機能

**安全削除**: 削除されたスナップショットは完全には削除されず、ゴミ箱に移動します。

```bash
# ゴミ箱の内容を確認
$ kc delete --list-trash
🗑️  ゴミ箱の内容 (3件):

1. 実験的実装（失敗）
   📅 削除日時: 8月13日 15:30 (1時間前)
   📅 元の作成日: 8月13日 10:00
   🆔 ID: c4d56789...
   
2. 古い調査メモ
   📅 削除日時: 8月13日 14:00 (3時間前)
   📅 元の作成日: 8月5日 09:30
   🆔 ID: a1b2c3d4...

# 間違えて削除した場合の復元
$ kc delete --restore c4d56789
✅ スナップショット 'c4d56789...' をゴミ箱から復元しました
📁 復元先: ~/.local/share/kodama-claude/snapshots/

# ゴミ箱を完全に空にする
$ kc delete --empty-trash
⚠️  ゴミ箱の3件のアイテムが完全に削除されます
[y/N] 本当に削除しますか？ y
✅ ゴミ箱を空にしました
```

#### `-f` / `--force` - 確認をスキップ

**用途**: スクリプトや自動化で使用

```bash
# 確認なしで削除
kc delete abc123 --force

# 古いスナップショットを自動削除（cronジョブなど）
0 2 * * 0 cd ~/project && kc delete --older-than 1m --force --json
```

### セキュリティ機能

`kc delete`コマンドには多重の安全対策が含まれています：

- **ソフト削除**: 完全削除ではなく、まずゴミ箱に移動
- **パストラバーサル保護**: `../`を含むIDは拒否
- **入力検証**: すべてのパラメータを厳密に検証
- **確認プロンプト**: 複数件削除時は詳細を表示して確認
- **自動バックアップ**: ゴミ箱が一種のバックアップとして機能
- **監査ログ**: 削除操作をevents.jsonlに記録

## `kc search` - スナップショット検索（v0.5.0+）

**目的**: 保存されたスナップショットから特定の情報を素早く見つけます。

### 基本的な使い方

```bash
# タイトル検索（高速・推奨）
kc search "認証機能"

# 全文検索（コンテキスト・決定事項も検索）
kc search "JWT" --full-text

# タグ検索
kc search --tags "auth"
kc search --tags "auth,backend"  # OR検索

# 正規表現検索（高度）
kc search "API.*エンドポイント" --regex

# JSON出力（スクリプト用）
kc search "認証" --json
```

### 検索モード

#### タイトル検索（デフォルト）

**特徴**: 高速・軽量・直感的

```bash
# タイトルのみを検索
$ kc search "認証"
🔍 検索結果: "認証" (2件見つかりました)

1. ユーザー認証機能の実装
   📅 8月12日 17:30 (関連度: 95%)
   📊 ステップ: implementing
   🏷️  タグ: auth, backend

2. 認証エラーハンドリング
   📅 8月10日 14:20 (関連度: 87%)
   📊 ステップ: done
   🏷️  タグ: auth, bugfix
```

#### `--full-text` - 全文検索

**特徴**: コンテキスト、決定事項、次のステップも検索対象

```bash
$ kc search "JWT" --full-text
🔍 全文検索結果: "JWT" (3件見つかりました)

1. ユーザー認証機能の実装
   📅 8月12日 17:30 (関連度: 98%)
   
   💡 マッチした箇所:
   💬 決定事項: "JWTトークンの有効期限は30分に設定"
   💬 コンテキスト: "...JWT実装でRS256アルゴリズムを選択..."

2. セキュリティ設計の検討
   📅 8月9日 10:15 (関連度: 85%)
   
   💡 マッチした箇所:
   💬 コンテキスト: "...認証方式としてJWTを採用することに決定..."
```

#### `--tags <タグ名>` - タグ検索

**特徴**: 作業カテゴリで絞り込み

```bash
# 単一タグで検索
$ kc search --tags "auth"
🔍 タグ検索: auth (4件見つかりました)

# 複数タグでOR検索
$ kc search --tags "auth,api"
🔍 タグ検索: auth,api (6件見つかりました)

# 複数タグでAND検索
$ kc search --tags "auth+backend"
🔍 タグ検索: auth AND backend (2件見つかりました)
```

#### `--regex` - 正規表現検索

**特徴**: 高度なパターンマッチング

```bash
# APIエンドポイント関連を検索
$ kc search "API.*エンドポイント" --regex

# 特定の形式のコミットIDを検索
$ kc search "[a-f0-9]{7,}" --regex --full-text

# 日付パターンで検索
$ kc search "202[4-5]-08-1[0-5]" --regex --full-text
```

### 時間フィルタ

#### `--since <期間>` - 開始時点の指定

```bash
# 1週間以内のスナップショットから検索
kc search "バグ" --since "1w"

# 3日前からの作業を検索
kc search "実装" --since "3d" 

# 特定の日付から検索
kc search "テスト" --since "2025-08-10"
```

#### `--until <期間>` - 終了時点の指定

```bash
# 1週間前までのスナップショットから検索
kc search "調査" --until "1w"

# 特定の期間を指定
kc search "設計" --since "2w" --until "1w"
```

### 検索結果の表示

#### 標準表示
```bash
🔍 検索結果: "認証" (2件見つかりました)

1. ユーザー認証機能の実装
   📅 8月12日 17:30 (関連度: 95%)
   📊 ステップ: implementing
   🏷️  タグ: auth, backend
   
   💡 ハイライト: "ユーザー認証機能を実装し、JWTトークンの生成..."

2. 認証エラーハンドリング改善
   📅 8月10日 14:20 (関連度: 87%)
   📊 ステップ: done
   🏷️  タグ: auth, bugfix
   
   💡 ハイライト: "認証エラーの処理を改善し、より分かりやすい..."
```

#### JSON出力
```json
{
  "query": "認証",
  "searchMode": "title",
  "results": [
    {
      "snapshot": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "ユーザー認証機能の実装",
        "timestamp": "2025-08-12T17:30:00Z",
        "step": "implementing",
        "tags": ["auth", "backend"]
      },
      "relevance": 0.95,
      "highlights": ["ユーザー認証機能を実装し..."]
    }
  ],
  "totalResults": 2
}
```

### 実用例

#### チーム引き継ぎ時の情報収集

```bash
# 1. 認証関連の全ての作業を検索
$ kc search --tags "auth" --json | jq -r '.results[] | "\(.snapshot.title) (\(.snapshot.step))"'
ユーザー認証機能の実装 (implementing)
認証設計の検討 (done)
認証テスト追加 (testing)

# 2. 具体的な実装詳細を検索
$ kc search "JWT" --full-text
# → 実装の詳細な決定事項が見つかる

# 3. 未完了のタスクを検索
$ kc search --tags "auth" --json | jq '.results[] | select(.snapshot.step != "done")'
```

#### バグ修正時の過去事例調査

```bash
# 1. 過去のバグ修正事例を検索
$ kc search "バグ修正" --since "1m"
🔍 過去1ヶ月の "バグ修正" (5件見つかりました)

# 2. 類似する症状の修正を検索
$ kc search "タイムアウト" --full-text
🔍 "タイムアウト" の関連作業 (3件見つかりました)

# 3. 特定のコンポーネントでの問題を検索
$ kc search "ログイン.*エラー" --regex --full-text
```

## `kc show` - スナップショット詳細表示の拡張機能（v0.5.0+）

### セキュリティ機能

すべての新しいコマンドには包括的なセキュリティ対策が実装されています：

**入力検証**:
- パストラバーサル攻撃の防止（`../`を含むIDを拒否）
- 有効なUUID形式の検証
- ファイル名の安全性チェック

**DoS保護**:
- 検索結果の最大数制限（1000件）
- ファイルサイズ制限（10MB）
- タイムアウト制限

**情報漏洩防止**:
- 制御文字の除去
- エラーメッセージのサニタイズ
- シンボリックリンク攻撃の防止

---

**ヒント**: 分からないことがあれば、`kc --help` や `kc <command> --help` でヘルプを確認できます。