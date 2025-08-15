// Debug utility for LibreChat
// Set which debug groups to show
const DEBUG_GROUPS = process.env.DEBUG_GROUPS ? process.env.DEBUG_GROUPS.split(',') : ['STREAMING', 'MESSAGE_FLOW', 'SSE'];

const debugGroups = {
  STREAMING: 'STREAMING',
  GENERAL: 'GENERAL',
  SSE: 'SSE',
  MESSAGE_FLOW: 'MESSAGE_FLOW'
};

function debug(group, message, ...args) {
  if (DEBUG_GROUPS.includes(group)) {
    const timestamp = new Date().toISOString();
    console.log(`DEBUG[${group}]: [${timestamp}] ${message}`, ...args);
  }
}

module.exports = {
  debug,
  debugGroups
};