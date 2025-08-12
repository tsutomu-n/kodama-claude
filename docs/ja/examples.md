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

## 自動化の例

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