/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

var logger = require('../').createLogger(module);

var hubs = require('./hubs');
var findHub = require('./findHub');

// This private constructor is wrapper by createLogger()
// and createSubpackageLogger() in index.js.  baseModule
// is only used to locate a hub; source is passed to the
// hub to identify output from this logger.
function Logger(baseModule, source) {
	this.source = source;
	this.hub = findHub(baseModule, source);

	if (!this.hub) {
		logger.trace("Couldn't find LogUp hub; falling back to QueuingHub until next tick");
		var self = this;
		var tempHub = this.hub = new hubs.QueuingHub();
		process.nextTick(function () {
			self.hub = findHub(baseModule, source);
			if (!self.hub) {
				logger.trace("Couldn't find LogUp hub after tick; falling back to built-in stub");
				self.hub = new hubs.StubHub();
			}
			tempHub.emitTo(self.hub);
		});
	}
	this.hub.attach(this);
}

/**
 * Called by the hub (or indirectly through a proxy) to broadcast a message to all loggers
 */
Logger.prototype.onBroadcast = function (name, versionRange, args) {

};