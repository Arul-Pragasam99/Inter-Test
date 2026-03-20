# Use official Node.js base image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your source code
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Command to start the app
CMD ["node", "server.js"]


