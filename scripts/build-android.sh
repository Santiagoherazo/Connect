#!/bin/bash
set -e
echo "📦 1/3 Compilando Next.js (export estático)..."
BUILD_MODE=capacitor npm run build

echo "📱 2/3 Sincronizando Capacitor..."
npx cap sync android

echo "🤖 3/3 Abriendo Android Studio..."
npx cap open android

echo ""
echo "✅ En Android Studio: Build → Generate Signed Bundle / APK"
