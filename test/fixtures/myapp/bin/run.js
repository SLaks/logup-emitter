module.exports = require('../../../..').createLogger(module);
delete require.cache[module.id];	// Make sure we resolve everything again next time.