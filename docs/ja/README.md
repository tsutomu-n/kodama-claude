# KODAMA Claude ドキュメント

KODAMA Claudeの完全なドキュメントへようこそ。

## 📚 ドキュメント構造

### 🟢 必須（ここから始める）
1. **[はじめに](getting-started.md)** - 2分でKODAMAをインストール
2. **[3コマンドガイド](usage-guide.md)** - `go`、`save`、`status`をマスター
3. **[日常のワークフロー](examples.md)** - 実例
4. **[コマンド詳細](command-details.md)** - 詳細なコマンドリファレンス

### 🟡 設定
- **[ストレージ管理](storage-management.md)** - ストレージと容量計画の理解
- **[トラブルシューティング](troubleshooting.md)** - 一般的な問題を解決
- **[カスタマイズ](customization.md)** - 設定を調整

### 🔴 上級
- **[APIリファレンス](api-reference.md)** - 完全なコマンド詳細
- **[内部構造](internals.md)** - KODAMAの内部動作

## 🎯 クイックナビゲーション

| 何をしたいか？ | このページへ |
|---------------|--------------|
| KODAMA Claudeをインストール | [はじめに](getting-started.md#installation) |
| 基本コマンドを学ぶ | [使用ガイド](usage-guide.md#basic-commands) |
| 実例を見る | [例](examples.md) |
| エラーを修正 | [トラブルシューティング](troubleshooting.md) |
| ストレージ管理 | [ストレージ管理](storage-management.md) |
| 設定を変更 | [カスタマイズ](customization.md) |
| コードを理解 | [内部構造](internals.md) |

## 🔍 トピック別検索

### インストールの問題
- [システム要件](getting-started.md#requirements)
- [インストール方法](getting-started.md#installation)
- [インストール確認](getting-started.md#verify)

### コマンドの使用（3つだけ！）
- [`kc go` - Claudeセッション開始](usage-guide.md#kc-go)
- [`kc save` - 保存＆コンテキスト貼り付け](usage-guide.md#kc-save)
- [`kc status` - 健康状態確認](usage-guide.md#kc-status)

### 一般的なタスク
- [朝の作業開始](examples.md#morning-workflow)
- [終業時のワークフロー](examples.md#evening-workflow)
- [プロジェクト間の切り替え](examples.md#multiple-projects)
- [チーム協業](examples.md#team-work)

### エラー修正
- [Claudeが見つからない](troubleshooting.md#claude-not-found)
- [権限エラー](troubleshooting.md#permission-errors)
- [ファイルロックエラー](troubleshooting.md#file-locks)
- [APIキーの問題](troubleshooting.md#api-key)

## 📖 このドキュメントの読み方

### 使用する記号

- 💡 **ヒント** - 便利なアドバイス
- ⚠️ **警告** - 重要な注意事項
- 🔧 **技術的** - 上級ユーザー向け
- 📝 **注記** - 追加情報
- ✅ **良い** - 推奨される方法
- ❌ **悪い** - 避けるべき方法

### コード例

コマンドはこのようなボックスで表示：
```bash
# これはコメント - コマンドを説明
kc go  # 作業を開始
```

出力はこのように表示：
```
✓ スナップショット読み込み完了
✓ Claude起動
```

### 難易度レベル

各セクションにはレベルがあります：
- 🟢 **初級** - 全員が読むべき
- 🟡 **中級** - 基本を知った後
- 🔴 **上級** - 必要な場合のみ

## 🆘 ヘルプの取得

1. **エラーメッセージを読む** - 何をすべきかがよく書かれています
2. **[トラブルシューティング](troubleshooting.md)を確認** - ほとんどの問題はここに
3. **`kc status`を実行** - セットアップをチェック
4. **このドキュメントを検索** - Ctrl+Fでキーワードを検索
5. **Issueを開く** - https://github.com/tsutomu-n/kodama-claude/issues

## 📝 ドキュメント更新

最終更新: 2025-01-10

これらのドキュメントはバージョン管理されています。各セクションには最終変更日が表示されます。

---

**覚えておいてください**: すべてを読む必要はありません。[はじめに](getting-started.md)から始めて、必要に応じて学んでください。