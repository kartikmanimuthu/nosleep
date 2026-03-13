#!/bin/bash
set -e

echo "☕ Installing nosleep..."

# Check if Node.js v18+ is installed
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed."
  echo ""
  echo "Would you like to install Node.js v18 via Homebrew? (y/n)"
  read -r response
  if [[ "$response" == "y" ]]; then
    if ! command -v brew &> /dev/null; then
      echo "❌ Homebrew is not installed. Please install Homebrew first:"
      echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
      exit 1
    fi
    echo "Installing Node.js v18..."
    brew install node@18
    export PATH="/opt/homebrew/opt/node@18/bin:$PATH"
  else
    echo "Please install Node.js v18+ manually: https://nodejs.org/"
    exit 1
  fi
fi

# Verify Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js v18+ is required. You have v$NODE_VERSION."
  exit 1
fi

echo "✓ Node.js $(node -v) detected"

# Clone or update nosleep repo
INSTALL_DIR="${HOME}/.nosleep-src"
if [ -d "$INSTALL_DIR" ]; then
  echo "Updating nosleep..."
  cd "$INSTALL_DIR"
  git pull origin main
else
  echo "Cloning nosleep..."
  git clone https://github.com/kartikmanimuthu/nosleep.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Install dependencies
echo "Installing dependencies..."
npm install --omit=dev

# Create symlink in /usr/local/bin
echo "Creating command symlink..."
sudo mkdir -p /usr/local/bin
sudo ln -sf "$INSTALL_DIR/source/cli.jsx" /usr/local/bin/nosleep
sudo chmod +x /usr/local/bin/nosleep

echo ""
echo "✓ nosleep installed successfully!"
echo ""
echo "Usage:"
echo "  nosleep                    # Start interactive TUI"
echo "  nosleep start              # Start sleep prevention"
echo "  nosleep status             # Check status"
echo "  nosleep stop               # Stop sleep prevention"
echo "  nosleep shutdown           # Kill daemon"
echo ""
echo "Run 'nosleep --help' for more options."
