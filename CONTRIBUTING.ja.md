# KODAMA Claudeへの貢献

KODAMA Claudeへの貢献に興味を持っていただきありがとうございます！

## 理念

貢献する前に、私たちのコア理念をご理解ください：
- **Less is more** - 意図的に機能を最小限に保つ
- **ジュニア開発者ファースト** - 30秒以上かかる学習は複雑すぎる
- **一つのことを上手くやる** - Claude対話メモリの永続化、それ以外は何もしない

## 受け入れる貢献

✅ **バグ修正** - いつでも歓迎  
✅ **パフォーマンス改善** - より高速・効率的に  
✅ **ドキュメント改善** - より明確に  
✅ **テストカバレッジ** - テストは多いほど良い  

## 受け入れない貢献

❌ **新機能** - コアミッションを直接サポートする場合を除く  
❌ **UI/UX追加** - これはCLIツール  
❌ **クラウド同期** - Gitを使ってください  
❌ **複雑なワークフロー** - 既存ツールを使ってください  

## 開発環境のセットアップ

1. Bunをインストール:
```bash
curl -fsSL https://bun.sh/install | bash
```

2. クローンしてインストール:
```bash
git clone https://github.com/tsutomu-n/kodama-claude
cd kodama-claude
bun install
```

3. テスト実行:
```bash
bun test
```

4. バイナリをビルド:
```bash
make build
```

## プルリクエストのプロセス

1. リポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b fix/amazing-fix`)
3. 変更を実施
4. テストを実行 (`bun test`)
5. 型チェックを実行 (`bun run typecheck`)
6. 明確なメッセージでコミット
7. フォークにプッシュ
8. プルリクエストを開く

## コードスタイル

- strictモードのTypeScript
- フォーマットにPrettier
- コメントより明確な変数名
- 可能な限りOOPより関数型

## テスト

新機能や修正にはすべてテストを含めてください：

```typescript
test("エッジケースを処理する", async () => {
  // 準備
  const input = createTestInput();
  
  // 実行
  const result = await functionUnderTest(input);
  
  // 検証
  expect(result).toBe(expected);
});
```

### テストの実行

```bash
# 全テストを実行
bun test

# 特定のテストファイルを実行
bun test guardian.test.ts

# カバレッジ付きで実行
bun test --coverage
```

## 翻訳ガイドライン

### 現在の言語
- **English** (`en`) - 主要言語
- **Japanese** (`ja`) - 日本語

### ファイル構造
```
docs/
├── en/           # 英語ドキュメント
│   └── *.md
└── ja/           # 日本語ドキュメント
    └── *.md

README.md         # 英語（デフォルト）
README.ja.md      # 日本語
```

### 翻訳への貢献方法

1. **新規翻訳の場合:**
   - 英語ファイルを対象言語フォルダにコピー
   - コンテンツを翻訳
   - 同じファイル名と構造を維持
   - 内部リンクを相対パスに更新

2. **翻訳の更新:**
   - `.github/translation-status.yml`で古い翻訳を確認
   - 英語版と比較
   - 翻訳を更新
   - ステータスファイルで`translated`としてマーク

3. **翻訳の慣例:**
   - コードブロックと例は英語のまま
   - コードブロック内のコメントは翻訳
   - コマンド名（`kc go`、`kc save`）は変更しない
   - ネイティブの数値形式と日付形式を使用

### 翻訳ステータス

`.github/translation-status.yml`を確認して、どのファイルが翻訳や更新を必要としているか確認してください。

ステータス値:
- `translated` - 完全に翻訳され最新
- `placeholder` - 自動生成されたプレースホルダー、翻訳が必要
- `outdated` - 翻訳は存在するが英語版が変更された

### 新しい言語の追加

1. `docs/`の下に言語コードで新しいフォルダを作成
2. 上部に言語セレクターを含むREADMEファイルを追加
3. 既存のすべてのREADMEを新しい言語オプションで更新
4. `package.json`設定に言語を追加
5. UI翻訳を追加する場合は`src/i18n.ts`を更新

## 質問？

大きな変更を行う前に、議論のためにissueを開いてください。

覚えておいてください: 最高の貢献は、しばしば複雑さに「ノー」と言うことです。