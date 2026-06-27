#!/bin/bash
set -e
echo "🔄 Sync Capacitor (dev mode → 10.0.2.2:3000)..."
npx cap sync android
echo "📱 Abriendo Android Studio..."
echo "   Corre 'npm run dev' en otra terminal primero"
npx cap open android
