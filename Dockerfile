FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp with latest version
RUN pip3 install --break-system-packages --upgrade yt-dlp

# Create symlink so yt-dlp can find node
RUN ln -sf /usr/local/bin/node /usr/bin/node

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy application files
COPY . .

# Create downloads directory
RUN mkdir -p downloads

# Expose port
EXPOSE 10000

# Set environment variable
ENV PORT=10000
ENV PATH="/usr/local/bin:${PATH}"

# Start the application
CMD ["node", "server.js"]
