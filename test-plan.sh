#!/bin/bash
# Test the plan command non-interactively

echo "Testing kc plan command..."
echo ""

# Create a plan using the API
cat > test-plan.ts << 'EOF'
import { Storage } from "./src/storage";
import { randomUUID } from "crypto";

const storage = new Storage();

const planSnapshot = {
  version: "1.0.0" as const,
  id: randomUUID(),
  title: "GitHub Release Plan",
  timestamp: new Date().toISOString(),
  step: "implementing" as const,
  context: `# Development Plan

## Goals
- Publish KODAMA Claude to GitHub
- Create automated release pipeline
- Enable one-liner installation

## Tasks
1. Create GitHub organization (kodama-cli)
2. Push repository to GitHub
3. Create release tag v0.1.0
4. Verify GitHub Actions builds
5. Test one-liner installation

## Considerations
- Keep repository public for easy access
- Use semantic versioning from start
- Document breaking changes clearly`,
  decisions: [],
  nextSteps: [
    "Create GitHub organization",
    "Push repository",
    "Create release tag",
    "Verify builds",
    "Test installation"
  ],
  cwd: process.cwd(),
  claudeSessionId: storage.loadSessionId() || undefined,
};

storage.saveSnapshot(planSnapshot);
console.log("✅ Plan created:", planSnapshot.id);
console.log("\n📋 " + planSnapshot.title);
console.log("="  .repeat(40));
console.log(planSnapshot.context);
EOF

bun run test-plan.ts
rm test-plan.ts

echo ""
echo "Now you can use: kc go"
echo "To execute this plan with Claude!"