module.exports = {
  apps : [
    {
      name: 'mev-bot-polygon',
      script: 'src/index.js',
      env: {
        CHAIN_ID: 137
      }
    },
    {
      name: 'mev-bot-base',
      script: 'src/index.js',
      env: {
        CHAIN_ID: 8453
      }
    },
    {
      name: 'mev-bot-optimism',
      script: 'src/index.js',
      env: {
        CHAIN_ID: 10
      }
    }
  ]
};
