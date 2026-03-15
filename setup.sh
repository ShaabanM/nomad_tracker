#!/bin/bash
# NomadTracker - Setup Script
# Generates the Xcode project using XcodeGen

set -e

echo "🌍 NomadTracker Setup"
echo "===================="

# Check for xcodegen
if ! command -v xcodegen &> /dev/null; then
    echo "📦 Installing XcodeGen via Homebrew..."
    brew install xcodegen
fi

# Generate Xcode project
echo "⚙️  Generating Xcode project..."
xcodegen generate

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Open NomadTracker.xcodeproj in Xcode"
echo "  2. Select your development team in Signing & Capabilities"
echo "  3. Connect your iPhone and hit Run"
echo ""
echo "To add your initial Schengen days (arrived March 10):"
echo "  → The onboarding flow will ask you when you arrived"
echo "  → Or go to Settings → Add Past Travel after setup"
