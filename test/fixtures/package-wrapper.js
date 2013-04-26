module.exports = require('../..').createSubpackageLogger(module, "library");
delete require.cache[module.id];	// Make sure we resolve everything again next time.