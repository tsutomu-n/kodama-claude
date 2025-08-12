# KODAMA Claude コマンド詳細ガイド

🟢 **難易度**: 初級〜中級 | **読了時間**: 10分

このガイドでは、KODAMA Claudeの3つのコマンドについて、オプションや動作を詳しく説明します。

## 目次
- [用語説明](#用語説明)
- [kc go - セッション開始コマンド](#kc-go---セッション開始コマンド)
- [kc save - 保存＆貼り付けコマンド](#kc-save---保存貼り付けコマンド)
- [kc status - 健康状態確認コマンド](#kc-status---健康状態確認コマンド)
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

最初は基本的な使い方から始めて、慣れてきたらオプションを活用してください。

---

**ヒント**: 分からないことがあれば、`kc --help` や `kc <command> --help` でヘルプを確認できます。