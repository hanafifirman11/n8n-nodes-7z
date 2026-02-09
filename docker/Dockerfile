# Custom N8N image with 7z support for n8n-nodes-7z
FROM n8nio/n8n:latest

# Switch to root to install packages
USER root

# Install p7zip (contains 7z command)
RUN apk add --no-cache p7zip

# Verify 7z installation
RUN which 7z && 7z --help | head -5

# Switch back to node user
USER node

# Set working directory
WORKDIR /data

# Default command
CMD ["n8n"]