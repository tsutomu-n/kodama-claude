#!/bin/bash
# KODAMA Claude Demo Script

echo "🎬 KODAMA Claude Demo"
echo "===================="
echo ""
echo "KODAMA solves one problem: Claude forgets your context between sessions."
echo "Watch how simple it is..."
echo ""
sleep 2

echo "Step 1: Create a snapshot of your work"
echo "$ kc snap"
echo ""
sleep 1

echo "📝 Creating snapshot..."
bun run src/snap-api.ts
echo ""
sleep 2

echo "Step 2: Later, when you return..."
echo "$ kc go"
echo ""
sleep 1

echo "🚀 This would start Claude with all your context restored!"
echo "(Demo mode - not actually starting Claude)"
echo ""
sleep 2

echo "Step 3: Or send context manually"
echo "$ kc send"
echo ""
kc send | head -10
echo ""
sleep 2

echo "That's it! Just 3 commands:"
echo "  • kc snap - Save your work"
echo "  • kc go   - Continue where you left off"
echo "  • kc send - Send context to Claude"
echo ""
echo "No configuration. No complexity. It just works."
echo ""
echo "🏔️ KODAMA Claude - Persistent memory for Claude Code"