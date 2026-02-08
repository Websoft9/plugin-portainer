#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Building portainer plugin from: $SCRIPT_DIR"
yarn build

echo "Deploying to websoft9-cockpit container..."
docker exec websoft9-cockpit rm -rf /usr/share/cockpit/portainer/*
docker cp "$SCRIPT_DIR/build/." websoft9-cockpit:/usr/share/cockpit/portainer/

echo "✅ Deployment complete!"
