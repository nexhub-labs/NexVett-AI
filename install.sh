#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=========================================="
echo "NexVett AI - Monorepo Setup"
echo "=========================================="

# Check if pnpm is installed
if ! command -v pnpm >/dev/null 2>&1; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "   npm install -g pnpm"
    printf "Press any key to exit..."
    read -r dummy
    exit 1
fi

echo "📦 Installing all dependencies (Monorepo)..."
if ! pnpm install; then
    echo "❌ Installation failed!"
    printf "Press any key to exit..."
    read -r dummy
    exit 1
fi

echo ""
echo "🚀 Starting servers in parallel..."
echo "[Hint] You can also run 'pnpm dev' from the root terminal."

# Determine OS/Environment
OS="$(uname -s)"
case "$OS" in
    CYGWIN*|MINGW*|MSYS*) OS="Windows" ;;
    Linux*)
        if grep -q Microsoft /proc/version; then
            OS="WSL"
        else
            OS="Linux"
        fi
        ;;
    Darwin*) OS="Mac" ;;
    *) OS="Unknown" ;;
esac

echo "Detected OS: $OS"

# Track background PIDs for cleanup
BGPIDS=()

cleanup() {
    if [ ${#BGPIDS[@]} -gt 0 ]; then
        echo ""
        echo "Stopping background processes..."
        kill "${BGPIDS[@]}" 2>/dev/null || true
    fi
}
trap cleanup EXIT

launch() {
    local TITLE="$1"
    local DIR="$2"
    local FILTER="$3"
    local FULL_PATH
    FULL_PATH="$(cd "$DIR" && pwd -W 2>/dev/null || pwd)"

    if [ "$OS" = "Windows" ]; then
        # Use a temp batch file to avoid quoting/space issues with CMD
        local TMPBAT
        TMPBAT="$(mktemp --suffix=.bat)"
        printf '@echo off\ncd /d "%s"\npnpm dev\n' "$FULL_PATH" > "$TMPBAT"
        # Convert the temp bat path to Windows format for cmd.exe
        local TMPBAT_WIN
        TMPBAT_WIN="$(cygpath -w "$TMPBAT" 2>/dev/null || echo "$TMPBAT")"
        cmd.exe /c start "$TITLE" cmd /k "\"$TMPBAT_WIN\""
    elif [ "$OS" = "WSL" ]; then
        cmd.exe /c start "$TITLE" cmd /k "wsl pnpm --filter $FILTER dev"
    elif [ "$OS" = "Mac" ]; then
        osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'/'$DIR'\" && pnpm dev"'
    elif [ "$OS" = "Linux" ]; then
        if command -v gnome-terminal >/dev/null 2>&1; then
            gnome-terminal --title="$TITLE" -- bash -c "cd \"$DIR\" && pnpm dev; exec bash"
        elif command -v x-terminal-emulator >/dev/null 2>&1; then
            x-terminal-emulator -e bash -c "cd \"$DIR\" && pnpm dev; exec bash"
        else
            echo "⚠️  Could not detect suitable terminal. Starting $TITLE in background..."
            (cd "$DIR" && pnpm dev) &
            BGPIDS+=($!)
        fi
    else
        echo "⚠️  Unknown OS. Starting $TITLE in background..."
        (cd "$DIR" && pnpm dev) &
        BGPIDS+=($!)
    fi
}

echo ""
echo "Starting Backend (nexvett-ai)..."
launch "NexVett AI Backend" "nexvett-ai" "nexvett-ai"

echo ""
echo "Starting Client (nexvett-ai-client)..."
launch "NexVett AI Client" "nexvett-ai-client" "nexvett-ai-client"

echo ""
echo "=========================================="
echo "Components are launching!"
echo "Backend: http://localhost:4111"
echo "Client: http://localhost:3000"
echo "=========================================="
printf "Press any key to exit..."
read -r dummy