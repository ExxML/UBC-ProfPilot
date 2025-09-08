# Use the official Playwright image which contains browsers and system deps.
FROM mcr.microsoft.com/playwright:v1.52.0-jammy

# Set working dir
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install production dependencies (use `npm ci` for package-lock.json)
RUN npm ci --only=production

# Delete playwright browsers installed previously
RUN rm -r $PLAYWRIGHT_BROWSERS_PATH
# Install webkit again for the correct OS
RUN npx playwright install webkit

# Copy the rest of the app
COPY . .

# Start command
CMD ["npm", "start"]