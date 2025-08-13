# 実例

🟢 **難易度**: 初級 | **読了時間**: 7分

実際のワークフローでKODAMA Claudeを使用する例です。

## 日常のワークフロー

### 朝のワークフロー {#morning-workflow}

```bash
# 1. コーヒーを用意して作業開始
$ kc go
# 出力:
# 🟢 セッションステータス: 健康
# 📸 最後のスナップショット: 昨日 18:30 "API実装完了"
# 📤 コンテキスト注入中...
# 🚀 Claude REPLを開いています...

# 2. Claudeが前回の続きから開始
> 昨日はユーザー認証APIを実装しましたね。
> JWTトークンの有効期限を30分に設定し、
> リフレッシュトークンの実装が次のステップでした。
> 今日はそこから始めましょうか？

# 3. 作業を進める...
```

### 終業時のワークフロー {#evening-workflow}

```bash
# 1. 今日の作業をまとめる
$ kc save
# 対話形式:
タイトル: リフレッシュトークン機能完成
ステップ (designing/implementing/testing/done): testing
達成内容をここに入力 (Ctrl+D で終了):
- リフレッシュトークンエンドポイント実装
- 自動更新ロジック追加
- エラーハンドリング強化
^D

決定事項をここに入力 (Ctrl+D で終了):
- トークン有効期限: アクセス30分、リフレッシュ7日
- 自動更新は期限5分前から可能
^D

次のステップをここに入力 (Ctrl+D で終了):
- 統合テスト作成
- ドキュメント更新
^D

✓ スナップショット保存完了
📋 クリップボードにコピーしますか？ (y/n): y
✓ コピー完了

# 2. Gitにコミット
$ git add .
$ git commit -m "feat: リフレッシュトークン機能を実装"
```

## プロジェクト管理

### 複数プロジェクト間の切り替え {#multiple-projects}

```bash
# プロジェクトA での作業
cd ~/projects/projectA
kc go -t "プロジェクトA: UI改善"
# ... 作業 ...
kc save -t "ボタンコンポーネント更新"

# プロジェクトB へ切り替え
cd ~/projects/projectB
kc go -t "プロジェクトB: バグ修正"
# ... 作業 ...
kc save -t "ログインバグ修正完了"

# プロジェクトA に戻る
cd ~/projects/projectA
kc go  # 前回の続きから自動再開
```

### チーム協業 {#team-work}

```bash
# 1. チームメンバーAが作業
$ kc go -t "決済システム設計"
# ... 設計作業 ...
$ kc save -t "決済フロー設計完了"

# 2. スナップショットをGitで共有
$ git add ~/.local/share/kodama-claude/snapshots/
$ git commit -m "docs: 決済システム設計スナップショット"
$ git push

# 3. チームメンバーBが引き継ぎ
$ git pull
$ kc go  # Aの設計内容を読み込んで続行
```

## 特定のシナリオ

### バグ修正フロー

```bash
# 1. バグレポートを受けて調査開始
$ kc go -t "ログイン画面バグ調査" -s testing

# 2. Claudeと問題を分析
> ユーザーからログイン画面でエラーが出ると報告がありました。
> エラーログを確認してください。

# 3. 修正実施
# ... コード修正 ...

# 4. 修正完了を記録
$ kc save -t "ログインバグ修正完了" -s done
```

### 新機能開発フロー

```bash
# 1. 設計フェーズ
$ kc go -t "通知システム設計" -s designing
# ... 仕様検討 ...
$ kc save

# 2. 実装フェーズ
$ kc go -s implementing
# ... コーディング ...
$ kc save

# 3. テストフェーズ
$ kc go -s testing
# ... テスト実施 ...
$ kc save

# 4. 完了
$ kc save -s done -t "通知システム完成"
```

### 緊急対応

```bash
# 1. 本番障害発生
$ kc go -t "緊急: 本番障害対応"

# 2. 調査と対応
> 本番環境でAPIがタイムアウトしています。
> ログを確認して原因を特定してください。

# 3. 対応記録を残す
$ echo "データベース接続プールの枯渇が原因。設定を調整して解決。" | kc save --stdin -y -t "障害対応完了"
```

## データ復旧と管理

### 誤削除からの復旧 {#recovery-examples}

```bash
# 1. 作業中に重要なスナップショットを誤って削除
$ kc delete abc123
# 削除完了: "API設計完了" (abc123ef)

# 2. 削除したことに気づいて確認
$ kc delete --show-trash
# ゴミ箱内容:
# abc123ef - API設計完了 (2025-08-13 14:30) [implementing]

# 3. 安全確認してから復元
$ kc restore --dry-run abc123
# [DRY RUN] 復元予定:
# - abc123ef "API設計完了" (2025-08-13 14:30)
# 復元先: ~/.local/share/kodama-claude/snapshots/

# 4. 実際に復元
$ kc restore abc123
# ✓ 復元完了: "API設計完了" (abc123ef)

# 5. 復元できたか確認
$ kc list -n 3
# 最新のスナップショット:
# abc123ef. API設計完了 (Aug 13 14:30) [implementing] #api,backend
```

### 一括復元操作 {#bulk-restore}

```bash
# 1. 昨日削除した複数のスナップショットを一括復元
$ kc delete --show-trash --json | jq -r '.items[] | select(.deletedAt | startswith("2025-08-12")) | .originalId'
# 出力:
# def456
# ghi789
# jkl012

# 2. 複数を一度に復元（dry-runで安全確認）
$ kc restore --dry-run def456 ghi789 jkl012
# [DRY RUN] 復元予定:
# - def456 "認証機能テスト" (2025-08-12 16:45)
# - ghi789 "データベース最適化" (2025-08-12 17:20)
# - jkl012 "エラーハンドリング改善" (2025-08-12 18:10)

# 3. 問題なければ実際に復元
$ kc restore def456 ghi789 jkl012
# ✓ 復元完了: 3個のスナップショット

# 4. タグ検索で特定の種類のみ復元
$ kc delete --show-trash --json | jq -r '.items[] | select(.tags | contains(["auth"])) | .originalId' | head -5 | xargs kc restore
# 認証関連の削除されたスナップショットを最大5個復元
```

### 日常ワークフローでの復旧統合 {#daily-recovery}

```bash
# 1. 朝の安全チェックルーチン
$ kc go
# セッション開始前にゴミ箱をチェック
$ trash_count=$(kc delete --show-trash --json | jq '.items | length')
$ if [ "$trash_count" -gt 0 ]; then
    echo "⚠️  ゴミ箱に $trash_count 個のアイテムがあります"
    kc delete --show-trash
    echo "復元が必要な場合: kc restore <id>"
  fi

# 2. 作業前の安全な実験
$ kc save -t "実験前のチェックポイント"
# 実験的な作業...
# もし失敗したら:
$ kc restore --dry-run $(kc list --json | jq -r '.snapshots[0].id')
$ kc restore $(kc list --json | jq -r '.snapshots[0].id')

# 3. 週次メンテナンス
#!/bin/bash
# weekly-cleanup.sh
echo "=== 週次スナップショットメンテナンス ==="
echo "現在の総数: $(kc list --json | jq '.snapshots | length')個"
echo "ゴミ箱の数: $(kc delete --show-trash --json | jq '.items | length')個"
echo "今週の作業: $(kc list --this-week --json | jq '.snapshots | length')個"
```

## リスト表示の活用例

### スクリプティング対応出力 {#scripting-lists}

```bash
# 1. ヘッダーなし出力でスクリプト処理
$ kc list --no-header -n 5
# abc123ef. API設計完了 (Aug 13 14:30) [implementing] #api,backend
# def456ab. 認証機能テスト (Aug 13 13:15) [testing] #auth
# ghi789cd. UI改善検討 (Aug 13 12:00) [designing] #frontend

# 2. ID だけ抽出してバッチ処理
$ ids=$(kc list --no-header -n 10 | cut -d. -f1)
$ for id in $ids; do
    echo "処理中: $id"
    # 何らかの処理...
  done

# 3. タイトル検索でフィルタリング
$ kc list --no-header | grep -i "api" | head -3
# abc123ef. API設計完了 (Aug 13 14:30) [implementing] #api,backend
# mno345pq. API仕様書更新 (Aug 12 16:20) [done] #api,docs
```

### TSV出力でデータ処理 {#tsv-processing}

```bash
# 1. TSV形式で構造化データ取得
$ kc list --machine -n 3
# ID      タイトル        タイムスタンプ       ステップ     タグ
# abc123ef    API設計完了      2025-08-13T14:30:15    implementing api,backend
# def456ab    認証機能テスト    2025-08-13T13:15:22    testing      auth
# ghi789cd    UI改善検討       2025-08-13T12:00:10    designing    frontend

# 2. ヘッダーなしTSVでawkによる高度な処理
$ kc list --machine --no-header | awk -F'\t' '{
    if ($4 == "testing") {
        printf "テスト中: %s (%s)\n", $2, $3
    }
}'
# テスト中: 認証機能テスト (2025-08-13T13:15:22)

# 3. ステップごとの作業数を集計
$ kc list --machine --no-header | cut -f4 | sort | uniq -c
#   3 designing
#   5 implementing  
#   2 testing
#   1 done

# 4. 特定のタグを含む作業のリスト
$ kc list --machine | awk -F'\t' '$5 ~ /auth/ {print $2 " - " $4}'
# 認証機能テスト - testing
# ログイン画面改善 - implementing
```

### Unixツール連携パイプライン {#unix-pipeline}

```bash
# 1. grepとawkを組み合わせた高度な検索
$ kc list --machine --no-header | grep "backend" | awk -F'\t' '{
    print "🔧 " $2 " [" $4 "]" 
}'
# 🔧 API設計完了 [implementing]
# 🔧 データベース最適化 [testing]

# 2. 日付別の作業統計
$ kc list --machine --no-header | awk -F'\t' '{
    split($3, date, "T")
    count[date[1]]++
} END {
    for (d in count) print d ": " count[d] "件"
}' | sort
# 2025-08-12: 5件
# 2025-08-13: 7件

# 3. miller (mlr) でCSV変換とフィルタリング
$ kc list --machine | mlr --tsv --ocsv cat > snapshots.csv
$ mlr --icsv --opprint filter '$step == "testing"' snapshots.csv

# 4. jq との連携で複雑なクエリ
$ kc list --json | jq -r '
  .snapshots[] | 
  select(.tags | contains(["auth"])) |
  "\(.title) (\(.step))"' |
  sort
# ログイン機能実装 (implementing)
# 認証機能テスト (testing)
# 認証フロー設計 (designing)
```

## 自動化の例

### 日次クリーンアップスクリプト {#daily-cleanup}

```bash
#!/bin/bash
# daily-maintenance.sh - 日次スナップショットメンテナンス

set -e

echo "=== KODAMA日次メンテナンス開始 $(date) ==="

# 1. 現在の状況確認
echo "\n📊 現在の状況:"
total=$(kc list --json | jq '.snapshots | length')
trash=$(kc delete --show-trash --json | jq '.items | length')
today=$(kc list --today --json | jq '.snapshots | length')

echo "  総スナップショット数: $total"
echo "  ゴミ箱の数: $trash"
echo "  今日の作業: $today"

# 2. 古い完了済み作業を自動削除（30日以上前の"done"ステップ）
echo "\n🗑️  古い完了済み作業を削除中..."
old_done=$(kc list --json | jq -r '
  .snapshots[] | 
  select(.step == "done" and 
         (.timestamp | strptime("%Y-%m-%dT%H:%M:%S") | mktime) < (now - 30*24*3600)) |
  .id'
)

if [ -n "$old_done" ]; then
  echo "削除対象: $(echo $old_done | wc -w)個"
  echo $old_done | xargs kc delete --batch
else
  echo "削除対象なし"
fi

# 3. ゴミ箱の古いアイテムを完全削除（7日以上経過）
echo "\n🔥 古いゴミ箱アイテムを完全削除中..."
kc delete --empty --older-than 7d

# 4. 重要な作業の自動バックアップ
echo "\n💾 重要作業の自動バックアップ..."
important=$(kc list --tags "important,critical" --json | jq -r '.snapshots[0].id // empty')
if [ -n "$important" ]; then
  backup_dir="$HOME/.kodama-backups/$(date +%Y-%m-%d)"
  mkdir -p "$backup_dir"
  # 重要なスナップショットをファイルとして保存
  kc list --tags "important,critical" --json > "$backup_dir/important-snapshots.json"
fi

# 5. レポート生成
echo "\n📈 本日の活動レポート:"
kc list --today --machine --no-header | awk -F'\t' '{
  step_count[$4]++
  tag_list = tag_list $5 " "
} END {
  print "ステップ別統計:"
  for (step in step_count) {
    printf "  %s: %d件\n", step, step_count[step]
  }
}'

echo "\n✅ メンテナンス完了 $(date)"
```

### バックアップ検証スクリプト {#backup-verification}

```bash
#!/bin/bash
# backup-verify.sh - スナップショットバックアップの整合性確認

echo "=== スナップショット整合性チェック ==="

# 1. 機械読み取り可能な形式で全データを取得
echo "📋 データを取得中..."
kc list --machine --no-header > /tmp/snapshots.tsv

# 2. データ整合性チェック
echo "🔍 整合性をチェック中..."
total_lines=$(wc -l < /tmp/snapshots.tsv)
valid_lines=$(awk -F'\t' 'NF == 5 && $1 ~ /^[a-f0-9]{8}/ {print}' /tmp/snapshots.tsv | wc -l)

if [ "$total_lines" -ne "$valid_lines" ]; then
  echo "❌ データ整合性エラー: $total_lines行中$valid_lines行のみ有効"
  exit 1
fi

# 3. 重複チェック
echo "🔄 重複チェック中..."
duplicates=$(cut -f1 /tmp/snapshots.tsv | sort | uniq -d | wc -l)
if [ "$duplicates" -gt 0 ]; then
  echo "⚠️  重複ID検出: $duplicates個"
  cut -f1 /tmp/snapshots.tsv | sort | uniq -d
fi

# 4. ファイルシステムとの整合性
echo "💾 ファイルシステム整合性チェック中..."
snapshot_dir="$HOME/.local/share/kodama-claude/snapshots"
fs_count=$(find "$snapshot_dir" -name "*.json" 2>/dev/null | wc -l || echo 0)
db_count=$(wc -l < /tmp/snapshots.tsv)

echo "  データベース記録: $db_count"
echo "  ファイルシステム: $fs_count"

if [ "$fs_count" -ne "$db_count" ]; then
  echo "⚠️  ファイルシステムとデータベースの不整合"
fi

# 5. 統計レポート
echo "\n📊 統計情報:"
awk -F'\t' '{
  step_count[$4]++
  
  # タグ統計
  split($5, tags, ",")
  for (i in tags) {
    if (tags[i] != "") tag_count[tags[i]]++
  }
  
  # 日付統計
  split($3, dt, "T")
  date_count[dt[1]]++
} END {
  print "ワークフローステップ:"
  for (step in step_count) {
    printf "  %s: %d件\n", step, step_count[step]
  }
  
  print "\n人気タグ (上位5件):"
  n = asorti(tag_count, sorted_tags, "@val_num_desc")
  for (i = 1; i <= (n > 5 ? 5 : n); i++) {
    printf "  %s: %d件\n", sorted_tags[i], tag_count[sorted_tags[i]]
  }
  
  print "\n日別統計:"
  n = asorti(date_count, sorted_dates, "@ind_str_desc")
  for (i = 1; i <= (n > 7 ? 7 : n); i++) {
    printf "  %s: %d件\n", sorted_dates[i], date_count[sorted_dates[i]]
  }
}' /tmp/snapshots.tsv

echo "\n✅ 整合性チェック完了"
rm -f /tmp/snapshots.tsv
```

### Unixツール統合の自動化 {#unix-integration}

```bash
# 1. Gitフック統合（pre-commit）
#!/bin/bash
# .git/hooks/pre-commit

# 進行中の作業を自動保存
if kc status --json | jq -e '.context.hasContext' > /dev/null; then
  current_step=$(kc status --json | jq -r '.context.step // "implementing"')
  if [ "$current_step" != "done" ]; then
    echo "コミット前の自動保存" | kc save --stdin -y -t "Git commit前チェックポイント"
  fi
fi

# 2. tmux セッション統合
#!/bin/bash
# tmux-kodama.sh

# tmux セッション名をプロジェクト名にする
project_name=$(basename $(pwd))
session_name="kodama-${project_name}"

# セッションが存在しない場合は作成
if ! tmux has-session -t "$session_name" 2>/dev/null; then
  tmux new-session -d -s "$session_name"
  
  # 作業状況を表示するペインを追加
  tmux split-window -h
  tmux send-keys -t "$session_name:0.1" '
    watch -n 30 "echo \"=== KODAMA状況 ===\" && kc status && echo \"\n=== 最新作業 ===\" && kc list -n 3"
  ' Enter
  
  # メインペインに戻る
  tmux select-pane -t "$session_name:0.0"
fi

# セッションにアタッチ
tmux attach-session -t "$session_name"

# 3. ログ統合システム
#!/bin/bash
# log-integration.sh

# システムログにKODAMAイベントを記録
log_kodama_event() {
  local event_type="$1"
  local message="$2"
  
  # TSV形式で活動ログに記録
  echo -e "$(date -Iseconds)\t$event_type\t$message" >> "$HOME/.kodama-activity.log"
  
  # システムログにも記録
  logger -t "kodama-claude" "$event_type: $message"
}

# KODAMAコマンドをラップして自動ログ記録
kc() {
  local cmd="$1"
  shift
  
  case "$cmd" in
    "save")
      # 保存前の状況を記録
      local current_context=$(command kc status --json | jq -r '.context.title // "無題"')
      log_kodama_event "SAVE_START" "Saving: $current_context"
      
      # 実際のコマンド実行
      local result=$(command kc save "$@")
      local exit_code=$?
      
      if [ $exit_code -eq 0 ]; then
        log_kodama_event "SAVE_SUCCESS" "Saved successfully"
      else
        log_kodama_event "SAVE_ERROR" "Save failed with code $exit_code"
      fi
      
      echo "$result"
      return $exit_code
      ;;
      
    "restore")
      log_kodama_event "RESTORE" "Restoring snapshots: $*"
      command kc restore "$@"
      ;;
      
    *)
      # その他のコマンドは通常通り
      command kc "$cmd" "$@"
      ;;
  esac
}

# 日次統計生成
generate_daily_stats() {
  local today=$(date -I)
  local log_file="$HOME/.kodama-activity.log"
  
  if [ -f "$log_file" ]; then
    echo "=== $today のKODAMA活動統計 ==="
    
    grep "^$today" "$log_file" | awk -F'\t' '{
      event_count[$2]++
      total++
    } END {
      printf "総イベント数: %d\n\n", total
      print "イベント別:"
      for (event in event_count) {
        printf "  %s: %d件\n", event, event_count[event]
      }
    }'
    
    echo "\n最新の活動:"
    grep "^$today" "$log_file" | tail -5 | awk -F'\t' '{
      printf "%s [%s] %s\n", $1, $2, $3
    }'
  fi
}

# 4. 外部ツール連携の例
# Slack通知（重要な作業完了時）
notify_slack_completion() {
  local snapshot_id="$1"
  local webhook_url="$SLACK_WEBHOOK_URL"
  
  if [ -n "$webhook_url" ]; then
    local snapshot_info=$(kc list --json | jq -r ".snapshots[] | select(.id == \"$snapshot_id\") | \"タイトル: \(.title)\\nステップ: \(.step)\\nタグ: \(.tags | join(\", \"))\"") 
    
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"📋 KODAMA作業完了\\n\`\`\`$snapshot_info\`\`\`\"}" \
      "$webhook_url"
  fi
}
```

### Git pre-commitフック

```bash
#!/bin/bash
# .git/hooks/pre-commit

# コンテキストが危険な状態なら自動保存
STATUS=$(kc status --json | jq -r '.level')
if [ "$STATUS" = "danger" ]; then
    echo "コミット前の自動保存" | kc save --stdin -y
fi
```

### 定期バックアップ（cron）

```bash
# crontab -e で追加
# 2時間ごとに自動保存
0 */2 * * * cd ~/project && echo "定期自動保存 $(date)" | kc save --stdin -y -t "自動バックアップ"
```

### CI/CDパイプライン

```yaml
# .github/workflows/build.yml
name: Build with Context Check

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install KODAMA
        run: |
          curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
      
      - name: Check and Save Context
        run: |
          if ! kc status --strict; then
            echo "ビルド前のチェックポイント" | kc save --stdin -y
          fi
      
      - name: Build
        run: npm run build
```

## ヒントとコツ

### 復元操作のベストプラクティス {#restore-best-practices}

```bash
# 良い例: 安全な復元手順
# 1. 常にdry-runで事前確認
kc restore --dry-run abc123

# 2. 複数復元時は少しずつ
kc restore --dry-run abc123 def456  # まず2個で確認
kc restore abc123 def456            # 実行
kc restore --dry-run ghi789         # 次の1個を確認
kc restore ghi789                   # 実行

# 3. 重要な復元前は現在の状況を保存
kc save -t "復元作業前のバックアップ"
kc restore abc123

# 悪い例: 危険な復元パターン
kc restore $(kc delete --show-trash --json | jq -r '.items[].originalId')  # 全て一括復元（危険）
kc restore abc  # あいまいなID指定（予期しない復元の可能性）
```

### スクリプト作成のコツ {#scripting-tips}

```bash
# 良い例: 堅牢なスクリプト
#!/bin/bash
set -euo pipefail  # エラー時即座に終了

# 1. データの存在チェック
if ! command -v kc &> /dev/null; then
  echo "エラー: KODAMA Claudeがインストールされていません" >&2
  exit 1
fi

# 2. JSON出力の安全な解析
snapshots_json=$(kc list --json)
if ! echo "$snapshots_json" | jq empty 2>/dev/null; then
  echo "エラー: 無効なJSON出力" >&2
  exit 1
fi

# 3. TSV処理の安全な方法
kc list --machine --no-header | while IFS=$'\t' read -r id title timestamp step tags; do
  # 各フィールドが空でないことを確認
  if [[ -n "$id" && -n "$title" ]]; then
    echo "処理中: $title ($id)"
  fi
done

# 悪い例: 脆弱なスクリプト
ids=$(kc list --no-header | cut -d. -f1)  # エラーハンドリングなし
for id in $ids; do
  kc restore $id  # dry-run確認なし（危険）
done
```

### 効率的なタイトル付け

```bash
# 良い例: 具体的で検索しやすい
kc save -t "認証API: JWT実装完了"
kc save -t "バグ#123: ログイン画面修正"
kc save -t "会議: セキュリティ要件決定"

# 悪い例: 曖昧で後で分からない
kc save -t "作業"
kc save -t "更新"
kc save -t "修正"
```

### ワークフローステップの活用

```bash
# プロジェクトの進行状況を明確に
kc go -s designing    # 月曜: 設計
kc go -s implementing # 火〜木: 実装
kc go -s testing      # 金曜: テスト
kc save -s done       # 完了時
```

### コンテキストサイズ管理

```bash
# 定期的にステータスチェック
$ kc status
# 🟡 警告が出たら保存を検討

# 長時間の作業前に保存
$ kc save -t "長時間作業前のチェックポイント"

# 重要な決定後は必ず保存
$ kc save -t "アーキテクチャ決定: マイクロサービス採用"
```

## 次のステップ

- **[コマンド詳細](command-details.md)** - 全オプションの詳細説明
- **[トラブルシューティング](troubleshooting.md)** - 問題解決
- **[カスタマイズ](customization.md)** - 環境に合わせた調整

---

**ヒント**: 実際の使用例から学ぶのが一番です。まずは基本的なワークフローから始めて、徐々に自動化を追加していきましょう。