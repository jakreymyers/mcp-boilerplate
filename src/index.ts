#!/usr/bin/env node

/**
 * MCP Boilerplate Server Entry Point
 * 
 * This is the main entry point for the MCP server. It handles:
 * - Process lifecycle management
 * - Graceful shutdown
 * - Error handling
 * - Server startup
 */

import { startServer } from './server.js';

// GOTCHA: Must handle process termination gracefully for proper cleanup
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// GOTCHA: Catch unhandled errors to prevent silent failures
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

/**
 * Main server startup function
 */
async function main(): Promise<void> {
  try {
    console.error('Starting MCP Boilerplate Server...'); // Use stderr for logging
    
    const server = await startServer();
    
    console.error('Server started successfully');
    console.error('Tools available: calculator_add');
    console.error('Waiting for requests...');
    
    // Keep the process alive
    // The server handles communication via STDIO transport
    
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Fatal error in main:', error);
  process.exit(1);
});