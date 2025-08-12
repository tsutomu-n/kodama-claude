# ストレージ管理

🟢 **難易度**: 初級 | **読了時間**: 10分

KODAMA Claudeのストレージシステム、容量計画、最適化の完全ガイド。

## 概要

KODAMA Claudeは以下を実現する効率的なストレージシステムを採用しています：
- コンテキスト履歴へのアクセス性を維持
- ストレージの肥大化を自動防止
- 高速パフォーマンスを維持
- 重要な作業を保護

## ストレージサイズの見積もり

### スナップショットあたり
- **平均サイズ**: 1スナップショットあたり1-2 KB
- **重いコンテキストの場合**: 3-5 KB
- **推奨最大値**: 10 KB

### 1日の使用量
- **軽い使用** (2-3回/日の保存): 約5 KB/日
- **通常使用** (5-10回/日の保存): 約15 KB/日
- **ヘビー使用** (20回以上/日の保存): 約40 KB/日

### 月間・年間予測
| 使用パターン | 月間 | 年間 | 
|--------------|------|------|
| 軽い使用 | 約150 KB | 約1.8 MB |
| 通常使用 | 約450 KB | 約5.4 MB |
| ヘビー使用 | 約1.2 MB | 約14 MB |

**結論**: ヘビーに使用しても、KODAMAの年間使用量は15 MB未満です。

## 自動アーカイブシステム

KODAMAは古いスナップショットを自動管理し、肥大化を防ぎます。

### 動作原理

1. **自動トリガー**: `kc go`または`kc save`実行時に動作
2. **経過日数チェック**: 30日以上経過したスナップショットを検出
3. **非破壊的移動**: `archive/`サブディレクトリへ移動
4. **アクセス性維持**: アーカイブ済みファイルは読み取り可能

### アーカイブの場所
```
~/.local/share/kodama-claude/snapshots/
├── current-snapshot.json      # アクティブなスナップショット
├── yesterday-snapshot.json    # 最近の作業
└── archive/                   # 自動アーカイブ済み（30日以上）
    └── old-snapshot.json      # アクセス可能
```

### アーカイブ閾値のカスタマイズ

```bash
# デフォルト: 30日
export KODAMA_ARCHIVE_DAYS=30

# 14日後にアーカイブ
export KODAMA_ARCHIVE_DAYS=14

# 60日後にアーカイブ
export KODAMA_ARCHIVE_DAYS=60
```

### 自動アーカイブの無効化

```bash
# 自動アーカイブを完全に無効化
export KODAMA_AUTO_ARCHIVE=false

# 再有効化（デフォルト）
unset KODAMA_AUTO_ARCHIVE
# または
export KODAMA_AUTO_ARCHIVE=true
```

## 決定事項の制限システム

KODAMAはスナップショットの肥大化を防ぐため、保存する決定事項を制限します。

### デフォルトの動作
- **最新5件**の決定事項のみ保存
- 古い決定事項は自動的にトリミング
- スナップショットを小さく、焦点を絞った状態に維持

### これが重要な理由
- コンテキストが圧倒的になるのを防ぐ
- ストレージ使用量を約70%削減
- Claudeの応答時間を改善

### 決定事項制限のカスタマイズ

```bash
# デフォルト: 5件の決定事項
export KODAMA_MAX_DECISIONS=5

# 10件の決定事項を保存
export KODAMA_MAX_DECISIONS=10

# 3件のみ保存
export KODAMA_MAX_DECISIONS=3

# 無制限の決定事項（非推奨）
export KODAMA_NO_LIMIT=true
```

**警告**: 無制限の決定事項は以下を引き起こす可能性があります：
- 大きなスナップショットファイル（各10-50 KB）
- Claudeの応答が遅くなる
- 時間とともにストレージが肥大化

## 環境変数リファレンス

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `KODAMA_AUTO_ARCHIVE` | `true` | 自動アーカイブの有効/無効 |
| `KODAMA_ARCHIVE_DAYS` | `30` | アーカイブまでの日数 |
| `KODAMA_MAX_DECISIONS` | `5` | 保持する決定事項の数 |
| `KODAMA_NO_LIMIT` | `false` | 決定事項制限を無効化 |
| `XDG_DATA_HOME` | `~/.local/share` | ベースデータディレクトリ |

## ストレージの場所

### デフォルトパス
```
~/.local/share/kodama-claude/
├── snapshots/              # アクティブなスナップショット
│   ├── *.json             # 現在の作業（30日未満）
│   └── archive/           # 古いスナップショット（30日以上）
├── events.jsonl           # イベントログ（追記専用）
└── .session              # 現在のセッション追跡
```

### カスタムストレージ場所

```bash
# XDG標準を使用
export XDG_DATA_HOME=/custom/path

# KODAMAは以下を使用:
# /custom/path/kodama-claude/
```

## 手動クリーンアップ手順

### ストレージ使用量の確認

```bash
# 合計サイズ
du -sh ~/.local/share/kodama-claude/

# ディレクトリ別の内訳
du -sh ~/.local/share/kodama-claude/*/

# スナップショット数をカウント
ls ~/.local/share/kodama-claude/snapshots/*.json | wc -l

# アーカイブ済み数をカウント
ls ~/.local/share/kodama-claude/snapshots/archive/*.json | wc -l
```

### 手動アーカイブ

```bash
# 14日以上経過したスナップショットをアーカイブ
find ~/.local/share/kodama-claude/snapshots -name "*.json" -mtime +14 \
  -exec mv {} ~/.local/share/kodama-claude/snapshots/archive/ \;
```

### アーカイブの圧縮

```bash
# 古いアーカイブを圧縮（サイズを約80%削減）
cd ~/.local/share/kodama-claude/snapshots/archive/
gzip *.json

# 圧縮ファイルを読む
zcat snapshot.json.gz | jq .
```

### 非常に古いアーカイブの削除

```bash
# 90日以上経過したアーカイブを削除
find ~/.local/share/kodama-claude/snapshots/archive/ \
  -name "*.json*" -mtime +90 -delete

# 確認付きで削除
find ~/.local/share/kodama-claude/snapshots/archive/ \
  -name "*.json*" -mtime +90 -exec rm -i {} \;
```

## ベストプラクティス

### 1. 自動管理に任せる
- デフォルト設定は99%のユーザーに最適
- 自動アーカイブがストレージをクリーンに保つ
- 決定事項制限が肥大化を防ぐ

### 2. 定期的な監視
```bash
# クイックヘルスチェック
kc status

# ストレージチェック（週次ルーチンに追加）
du -sh ~/.local/share/kodama-claude/
```

### 3. ワークフローに合わせて調整

**長期プロジェクト**（数ヶ月）:
```bash
export KODAMA_ARCHIVE_DAYS=60  # コンテキストを長く保持
```

**短期タスク**（数日）:
```bash
export KODAMA_ARCHIVE_DAYS=14  # 早めにアーカイブ
export KODAMA_MAX_DECISIONS=3  # 小さいスナップショット
```

**CI/CD環境**:
```bash
export KODAMA_AUTO_ARCHIVE=false  # 予測可能な状態
export KODAMA_MAX_DECISIONS=1     # 最小限のストレージ
```

### 4. 重要な作業のバックアップ

```bash
# KODAMA全データのバックアップ
tar -czf kodama-backup-$(date +%Y%m%d).tar.gz \
  ~/.local/share/kodama-claude/

# 特定プロジェクトのスナップショットをバックアップ
cp ~/.local/share/kodama-claude/snapshots/important-*.json \
  ~/project-backups/
```

## ストレージ問題のトラブルシューティング

### 問題: ストレージが大きくなりすぎる

**スペースを使用しているものを確認**:
```bash
# 大きなスナップショットを検索
find ~/.local/share/kodama-claude -name "*.json" -size +10k -ls

# 自動アーカイブが動作しているか確認
echo "自動アーカイブ: ${KODAMA_AUTO_ARCHIVE:-true}"
echo "アーカイブ日数: ${KODAMA_ARCHIVE_DAYS:-30}"
```

**修正**:
```bash
# アーカイブを強制実行
kc status  # 自動アーカイブをトリガー

# 手動クリーンアップ
find ~/.local/share/kodama-claude/snapshots -name "*.json" \
  -mtime +30 -exec mv {} ~/.local/share/kodama-claude/snapshots/archive/ \;
```

### 問題: スナップショットが大きすぎる

**スナップショットサイズの確認**:
```bash
ls -lh ~/.local/share/kodama-claude/snapshots/*.json | head -5
```

**修正**:
```bash
# 決定事項を制限
export KODAMA_MAX_DECISIONS=3

# 現在の制限を確認
echo "最大決定事項数: ${KODAMA_MAX_DECISIONS:-5}"
echo "無制限: ${KODAMA_NO_LIMIT:-false}"
```

### 問題: 古いスナップショットが見つからない

**アーカイブを確認**:
```bash
ls ~/.local/share/kodama-claude/snapshots/archive/
```

**アーカイブから復元**:
```bash
# アクティブディレクトリにコピー
cp ~/.local/share/kodama-claude/snapshots/archive/old-snapshot.json \
   ~/.local/share/kodama-claude/snapshots/
```

## パフォーマンスへの影響

| スナップショット数 | パフォーマンス | 推奨事項 |
|-------------------|---------------|----------|
| < 100 | 優秀 | 対応不要 |
| 100-500 | 良好 | 通常の自動アーカイブで十分 |
| 500-1000 | やや遅い | 手動アーカイブを検討 |
| > 1000 | 低下 | クリーンアップ推奨 |

## ストレージ容量計画

### 小規模プロジェクト（個人）
- **期間**: 1-3ヶ月
- **予想ストレージ**: < 1 MB
- **設定**: デフォルトで完璧に動作

### 中規模プロジェクト（チーム）
- **期間**: 3-12ヶ月  
- **予想ストレージ**: 2-5 MB
- **推奨設定**:
  ```bash
  export KODAMA_ARCHIVE_DAYS=45
  export KODAMA_MAX_DECISIONS=5
  ```

### 大規模プロジェクト（エンタープライズ）
- **期間**: 12ヶ月以上
- **予想ストレージ**: 5-15 MB
- **推奨設定**:
  ```bash
  export KODAMA_ARCHIVE_DAYS=60
  export KODAMA_MAX_DECISIONS=3
  # 月次バックアップルーチンを設定
  ```

## まとめ

KODAMAのストレージシステムは、ほとんどのユーザーにとってメンテナンス不要になるよう設計されています：

1. **自動管理** - 30日後に古いスナップショットをアーカイブ
2. **スマートな制限** - 最新5件の決定事項のみ保持
3. **小さなフットプリント** - 年間約5-15 MB使用
4. **カスタマイズ可能** - 環境変数で調整
5. **非破壊的** - 削除せず、アーカイブのみ

デフォルト設定は99%のユーザーに最適です。特別なニーズがある場合のみ調整してください。

---

**覚えておいてください**: KODAMAはシンプルであることを目指しています。デフォルト設定を信頼すれば、ストレージを自動管理してくれます。