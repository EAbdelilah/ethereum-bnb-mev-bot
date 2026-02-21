/**
 * ConnectionManager - Manages RPC and WebSocket lifecycle with robust reconnection
 */

const { ethers } = require('ethers');
const logger = require('../utils/logger');

class ConnectionManager {
    constructor(config) {
        this.config = config;
        this.provider = null;
        this.wallet = null;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 5000;
    }

    /**
     * Create a robust WebSocket provider with auto-reconnect
     */
    async createProvider() {
        if (this.provider) {
            try {
                this.provider._websocket.terminate();
            } catch (e) {}
        }

        const url = this.config.network.wssUrl;
        logger.info(`🔌 Connecting to WebSocket: ${url}`);

        this.provider = new ethers.providers.WebSocketProvider(url);

        this.provider._websocket.on('open', () => {
            logger.info('✅ WebSocket connection established');
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
        });

        this.provider._websocket.on('close', (code) => {
            logger.error(`📡 WebSocket connection closed (code: ${code})`);
            this.handleReconnect();
        });

        this.provider._websocket.on('error', (error) => {
            logger.error('📡 WebSocket error:', error.message);
            this.handleReconnect();
        });

        // Initialize wallet
        this.wallet = new ethers.Wallet(this.config.wallet.privateKey, this.provider);

        return { provider: this.provider, wallet: this.wallet };
    }

    /**
     * Handle reconnection logic with exponential backoff
     */
    async handleReconnect() {
        if (this.isReconnecting) return;
        this.isReconnecting = true;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('🚨 Max reconnection attempts reached. Shutting down...');
            process.exit(1);
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 60000);

        logger.info(`🔄 Reconnecting in ${delay/1000}s (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        setTimeout(async () => {
            try {
                await this.createProvider();
                // Notify the bot instance to update its provider/wallet
                if (this.onReconnect) this.onReconnect(this.provider, this.wallet);
            } catch (error) {
                logger.error('❌ Reconnection failed:', error.message);
                this.isReconnecting = false;
                this.handleReconnect();
            }
        }, delay);
    }

    /**
     * Register a callback for successful reconnection
     */
    onReconnectCallback(callback) {
        this.onReconnect = callback;
    }
}

module.exports = ConnectionManager;
