# はじめに

🟢 **難易度**: 初級 | **読了時間**: 5分

このガイドでは、KODAMA Claudeをインストールして最初のセッションを開始するまでをご案内します。

## 前提条件 {#requirements}

### 必須
- **Claude Code** - [公式インストールガイド](https://docs.anthropic.com/en/docs/claude-code)
- **Linux/macOS/WSL** - Bashシェル環境
- **Git** - バージョン管理（オプションだが推奨）

### オプション（拡張機能用）
- **xclip** (Linux) - クリップボード統合
- **wl-clipboard** (Wayland) - Waylandクリップボード
- **pbcopy** (macOS) - macOSクリップボード（内蔵）
- **clip.exe** (WSL) - Windows統合

## インストール {#installation}

### ワンライナーインストール（推奨）

```bash
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
```

このコマンドは：
- 古いバージョンを自動検出・削除
- アーキテクチャに合ったバイナリをダウンロード
- SHA256チェックサムを検証
- `/usr/local/bin/kc`にインストール
- 開始するための3つのコマンドを表示

### 手動インストール

1. アーキテクチャに合ったバイナリをダウンロード：
   - Linux x64: `kc-linux-x64`
   - Linux ARM64: `kc-linux-arm64`

2. 実行可能にしてPATHに追加：

```bash
chmod +x kc-linux-x64
sudo mv kc-linux-x64 /usr/local/bin/kc
```

## インストールの確認 {#verify}

```bash
# バージョン確認
kc --version

# ヘルスチェック
kc status
```

期待される出力：
```
KODAMA Claude v0.4.0
❓ | basis: no_session | hint: start with 'kc go'
```

## 最初の10分

### 1. 最初のセッション開始（1分）

```bash
kc go
```

出力：
```
❓ セッションがありません
📝 新しいスナップショットを作成しています...
✓ スナップショット保存完了
📤 コンテキスト注入中...
🚀 Claude REPLを開いています...
```

### 2. Claudeと対話（5分）

Claudeに質問や作業を依頼：
```
> このプロジェクトのREADMEを改善してください
```

### 3. 進捗を保存（2分）

```bash
kc save
```

プロンプトに従って入力：
- タイトル: "README改善"
- ステップ: implementing
- 達成内容: READMEを更新
- 決定事項: 新しい構造を採用
- 次のステップ: 例を追加

### 4. ステータス確認（30秒）

```bash
kc status
```

出力：
```
🟢 | basis: transcript | hint: no action needed
```

## 次のステップ

- **[3コマンドガイド](usage-guide.md)** - コアコマンドをマスター
- **[日常のワークフロー](examples.md)** - 実践的な使用例
- **[トラブルシューティング](troubleshooting.md)** - 問題が発生した場合

---

**ヒント**: KODAMA Claudeは3つのコマンドだけです。`kc go`で開始、`kc save`で保存、`kc status`で確認。