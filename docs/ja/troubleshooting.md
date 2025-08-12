# トラブルシューティング

🟡 **難易度**: 中級 | **読了時間**: 5分

KODAMA Claudeの一般的な問題と解決方法です。

## インストールの問題

### Claudeが見つからない {#claude-not-found}

**エラー:**
```
Error: Claude not found. Please install it first.
```

**解決方法:**
```bash
# Claude Codeをインストール
# 公式ドキュメントを参照: https://docs.anthropic.com/en/docs/claude-code

# インストール確認
claude --version
```

### 権限エラー {#permission-errors}

**エラー:**
```
Permission denied: /usr/local/bin/kc
```

**解決方法:**
```bash
# sudoで再インストール
sudo curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | sudo bash

# または手動で権限を修正
sudo chmod +x /usr/local/bin/kc
```

## 実行時の問題

### ファイルロックエラー {#file-locks}

**エラー:**
```
Error: File is locked by another process
```

**解決方法:**
```bash
# ロックファイルを削除
rm ~/.local/share/kodama-claude/.lock

# プロセスを確認
ps aux | grep kc

# 必要に応じてプロセスを終了
kill <PID>
```

### APIキーの問題 {#api-key}

**エラー:**
```
Error: Invalid API key
```

**解決方法:**
```bash
# APIキーを設定
export ANTHROPIC_API_KEY="your-api-key"

# 永続化（bash）
echo 'export ANTHROPIC_API_KEY="your-api-key"' >> ~/.bashrc
source ~/.bashrc

# 永続化（zsh）
echo 'export ANTHROPIC_API_KEY="your-api-key"' >> ~/.zshrc
source ~/.zshrc
```

## クリップボードの問題

### クリップボードが動作しない

**症状:** `kc save`でコピーができない

**解決方法:**

#### Linux (X11)
```bash
# xclipをインストール
sudo apt install xclip  # Ubuntu/Debian
sudo yum install xclip  # RHEL/CentOS
```

#### Linux (Wayland)
```bash
# wl-clipboardをインストール
sudo apt install wl-clipboard  # Ubuntu/Debian
sudo dnf install wl-clipboard  # Fedora
```

#### WSL
```bash
# clip.exeは通常利用可能
# 動作しない場合はOSC52を使用
kc save --copy osc52
```

#### SSH接続時
```bash
# OSC52プロトコルを使用
kc save --copy osc52

# またはファイル経由
kc save --copy file
cat /tmp/kodama-clipboard.txt
```

## ストレージの問題

### ディスクスペース不足

**エラー:**
```
Error: No space left on device
```

**解決方法:**
```bash
# 古いスナップショットを確認
ls -la ~/.local/share/kodama-claude/snapshots/archive/

# 30日以上前のアーカイブを削除
find ~/.local/share/kodama-claude/snapshots/archive/ -mtime +30 -delete

# ディスク使用量を確認
du -sh ~/.local/share/kodama-claude/
```

### 破損したスナップショット

**症状:** JSONパースエラー

**解決方法:**
```bash
# 破損したファイルをバックアップ
mv ~/.local/share/kodama-claude/snapshots/corrupted.json ~/backup/

# 最新の正常なスナップショットから再開
kc go
```

## 環境固有の問題

### WSLでCtrl+Dが動作しない

**症状:** 入力を終了できない

**解決方法:**
```bash
# WSLではCtrl+Zを使用
# またはEnterを2回押す（空行）
```

### 日本語が文字化けする

**解決方法:**
```bash
# ロケールを設定
export LANG=ja_JP.UTF-8
export LC_ALL=ja_JP.UTF-8

# 永続化
echo 'export LANG=ja_JP.UTF-8' >> ~/.bashrc
echo 'export LC_ALL=ja_JP.UTF-8' >> ~/.bashrc
source ~/.bashrc
```

## バージョン関連の問題

### v0.1.0からのアップグレードエラー

**症状:** `unknown option '--system'`エラー

**解決方法:**
```bash
# 古いバージョンを削除
sudo rm /usr/local/bin/kc

# 最新版を再インストール
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash

# バージョン確認
kc --version  # 0.3.0以上であることを確認
```

## デバッグ方法

### デバッグモードを有効化

```bash
# デバッグ出力を表示
export KODAMA_DEBUG=true
kc go

# 詳細なエラー情報を取得
kc status --json | jq .
```

### ログファイルの確認

```bash
# イベントログを確認
tail -f ~/.local/share/kodama-claude/events.jsonl

# 最新のスナップショットを確認
ls -lt ~/.local/share/kodama-claude/snapshots/ | head
```

## よくある質問

### Q: スナップショットはどこに保存される？

```bash
~/.local/share/kodama-claude/
├── snapshots/          # スナップショット
│   └── archive/        # 30日以上前のアーカイブ
├── events.jsonl        # イベントログ
└── .session           # 現在のセッションID
```

### Q: 設定をリセットしたい

```bash
# データをバックアップ
cp -r ~/.local/share/kodama-claude ~/kodama-backup

# 設定をリセット（データは保持）
rm ~/.local/share/kodama-claude/.session
rm ~/.local/share/kodama-claude/events.jsonl

# 完全リセット（注意：全データ削除）
rm -rf ~/.local/share/kodama-claude
```

### Q: 他のマシンと同期したい

```bash
# Gitで管理
cd ~/.local/share/kodama-claude
git init
git add .
git commit -m "Sync snapshots"
git remote add origin <your-repo>
git push

# 他のマシンで
git clone <your-repo> ~/.local/share/kodama-claude
```

## それでも解決しない場合

1. **エラーメッセージを記録**
2. **環境情報を収集:**
   ```bash
   kc --version
   claude --version
   uname -a
   echo $SHELL
   ```
3. **GitHubでIssueを作成:**
   https://github.com/tsutomu-n/kodama-claude/issues

---

**ヒント**: ほとんどの問題は`kc status`で原因が分かります。まずはステータスを確認してください。