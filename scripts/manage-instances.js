/**
 * Instance Manager - Helper to launch multiple bot instances
 */

const { exec } = require('child_process');
const logger = require('../src/utils/logger');

const chains = [
    { id: 137, name: 'Polygon' },
    { id: 8453, name: 'Base' },
    { id: 10, name: 'Optimism' }
];

function startInstance(chain) {
    logger.info(`🚀 Starting instance for ${chain.name} (ID: ${chain.id})...`);

    // Using pm2 to start the instance
    const command = `pm2 start src/index.js --name mev-bot-${chain.name.toLowerCase()} --env CHAIN_ID=${chain.id}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            logger.error(`❌ Error starting ${chain.name}: ${error.message}`);
            return;
        }
        logger.info(`✅ ${chain.name} instance started successfully`);
    });
}

// Start all configured chains
chains.forEach(startInstance);
