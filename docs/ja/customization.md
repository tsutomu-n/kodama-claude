# カスタマイズ

🟡 **難易度**: 中級 | **読了時間**: 5分

KODAMA Claudeを環境に合わせてカスタマイズする方法です。

## 環境変数

### 言語設定

```bash
# 日本語に設定
export KODAMA_LANG=ja

# 永続化（bash）
echo 'export KODAMA_LANG=ja' >> ~/.bashrc
source ~/.bashrc

# 永続化（zsh）
echo 'export KODAMA_LANG=ja' >> ~/.zshrc
source ~/.zshrc

# systemd環境（XDG準拠）
mkdir -p ~/.config/environment.d
echo 'KODAMA_LANG=ja' >> ~/.config/environment.d/kodama.conf
# 再ログインで適用
```

### デバッグモード

```bash
# デバッグ情報を表示
export KODAMA_DEBUG=true

# 一時的に有効化
KODAMA_DEBUG=true kc go
```

### スマートコンテキスト管理

```bash
# 5件制限を無効化（全決定事項を表示）
export KODAMA_NO_LIMIT=true

# 30日自動アーカイブを無効化
export KODAMA_AUTO_ARCHIVE=false

# CLAUDE.md自動同期を有効化
export KODAMA_CLAUDE_SYNC=true
```

## ストレージ設定

### カスタムストレージパス

デフォルトでは`~/.local/share/kodama-claude/`を使用しますが、シンボリックリンクで変更可能：

```bash
# 別の場所を使用
mkdir -p ~/my-data/kodama
ln -s ~/my-data/kodama ~/.local/share/kodama-claude

# ネットワークドライブを使用
ln -s /mnt/shared/kodama ~/.local/share/kodama-claude
```

### ファイル権限

```bash
# セキュアな権限設定（デフォルト）
chmod 700 ~/.local/share/kodama-claude
chmod 600 ~/.local/share/kodama-claude/snapshots/*.json

# チーム共有用に権限を緩める（注意）
chmod 750 ~/.local/share/kodama-claude
chmod 640 ~/.local/share/kodama-claude/snapshots/*.json
```

## クリップボード設定

### 優先順位のカスタマイズ

```bash
# 特定のコピーモードを強制
alias kc-save='kc save --copy osc52'  # SSH優先
alias kc-save='kc save --copy file'   # ファイル優先

# 関数でラップ
kc-save() {
    if [ -n "$SSH_CLIENT" ]; then
        kc save --copy osc52 "$@"
    else
        kc save --copy clipboard "$@"
    fi
}
```

## シェル統合

### Bashエイリアス

```bash
# ~/.bashrc に追加
alias kcg='kc go'
alias kcs='kc save'
alias kcst='kc status'

# プロジェクト別エイリアス
alias project1='cd ~/projects/project1 && kc go -t "Project 1"'
alias project2='cd ~/projects/project2 && kc go -t "Project 2"'
```

### Zsh関数

```zsh
# ~/.zshrc に追加
# 朝の開始ルーチン
morning() {
    echo "☕ おはようございます！"
    kc status
    kc go -t "Morning: $(date +%Y-%m-%d)"
}

# 終業ルーチン
evening() {
    kc save -t "Evening checkpoint" -s done
    kc status
    echo "🌙 お疲れ様でした！"
}
```

### Fish設定

```fish
# ~/.config/fish/config.fish に追加
function morning
    echo "☕ おはようございます！"
    kc status
    kc go -t "Morning: "(date +%Y-%m-%d)
end

function evening
    kc save -t "Evening checkpoint" -s done
    kc status
    echo "🌙 お疲れ様でした！"
end
```

## Git統合

### Gitフック

```bash
# .git/hooks/pre-commit
#!/bin/bash
# コミット前に自動保存

STATUS=$(kc status --json | jq -r '.level')
if [ "$STATUS" = "danger" ] || [ "$STATUS" = "warning" ]; then
    echo "Auto-saving before commit" | kc save --stdin -y -t "Pre-commit snapshot"
fi
```

### Gitエイリアス

```bash
# ~/.gitconfig に追加
[alias]
    kc-commit = "!f() { kc save -t \"$1\" && git add -A && git commit -m \"$1\"; }; f"
    kc-push = "!f() { kc save -t \"Pushing to remote\" && git push; }; f"
```

## 自動化

### Crontab設定

```bash
# crontab -e で追加

# 2時間ごとに自動保存
0 */2 * * * cd ~/project && echo "Periodic save" | kc save --stdin -y

# 毎日の終業時に保存
0 18 * * 1-5 cd ~/project && echo "End of day" | kc save --stdin -y -s done

# 週次バックアップ
0 9 * * 1 tar -czf ~/backup/kodama-$(date +\%Y\%m\%d).tar.gz ~/.local/share/kodama-claude/
```

### Systemdタイマー

```ini
# ~/.config/systemd/user/kodama-save.service
[Unit]
Description=KODAMA Claude Auto Save

[Service]
Type=oneshot
WorkingDirectory=%h/project
ExecStart=/usr/local/bin/kc save --stdin -y -t "Auto save"
StandardInput=data
StandardInputText=Systemd timer save

# ~/.config/systemd/user/kodama-save.timer
[Unit]
Description=KODAMA Claude Auto Save Timer

[Timer]
OnCalendar=*:0/120
Persistent=true

[Install]
WantedBy=timers.target
```

有効化：
```bash
systemctl --user enable kodama-save.timer
systemctl --user start kodama-save.timer
```

## tmux/screen統合

### tmuxステータスバー

```bash
# ~/.tmux.conf に追加
set -g status-right '#(kc status --json | jq -r .level) | %H:%M'
```

### screenステータス

```bash
# ~/.screenrc に追加
backtick 1 60 60 kc status --json | jq -r .level
hardstatus alwayslastline "%1` | %H:%M"
```

## VS Code統合

### タスク設定

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "KODAMA Save",
      "type": "shell",
      "command": "kc save -t \"VSCode checkpoint\"",
      "group": "none",
      "problemMatcher": []
    },
    {
      "label": "KODAMA Status",
      "type": "shell",
      "command": "kc status",
      "group": "none",
      "problemMatcher": []
    }
  ]
}
```

### キーバインディング

```json
// .vscode/keybindings.json
[
  {
    "key": "ctrl+alt+s",
    "command": "workbench.action.tasks.runTask",
    "args": "KODAMA Save"
  },
  {
    "key": "ctrl+alt+k",
    "command": "workbench.action.tasks.runTask",
    "args": "KODAMA Status"
  }
]
```

## パフォーマンス調整

### 大規模プロジェクト

```bash
# アーカイブを早める（14日後）
export KODAMA_ARCHIVE_DAYS=14

# スナップショット数を制限
find ~/.local/share/kodama-claude/snapshots/ -mtime +7 -delete
```

### 低速環境

```bash
# JSONのpretty printを無効化
export KODAMA_COMPACT_JSON=true

# 自動機能を無効化
export KODAMA_NO_AUTO=true
```

## 次のステップ

- **[APIリファレンス](api-reference.md)** - 詳細な技術仕様
- **[内部構造](internals.md)** - 動作原理の理解
- **[トラブルシューティング](troubleshooting.md)** - 問題解決

---

**ヒント**: カスタマイズは必要最小限に。シンプルさがKODAMAの強みです。