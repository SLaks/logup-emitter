/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

// This file contains the core communication layer for Logger objects

// This function must be exported first, so
// that index.js can call it for our logger
module.exports = Logger;

var semver = require('semver');

var util = require('./util');
var hubs = require('./hubs');
var findHub = require('./findHub');

// This private constructor is wrapper by createLogger()
// and createSubpackageLogger() in index.js.  baseModule
// is only used to locate a hub; source is passed to the
// hub on invocation to identify output from this logger
function Logger(baseModule, source) {
	this.protocolVersion = source.protocolVersion;
	this.source = source;
	this.hub = findHub(baseModule, source);

	if (!this.hub) {
		// When we create this file's logger, it won't exist yet.
		logger && logger.trace("Couldn't find LogUp hub; falling back to QueuingHub until next tick");
		var self = this;
		var tempHub = this.hub = new hubs.QueuingHub();

		var ensureHub = function () {
			process.removeListener('exit', ensureHub);
			if (self.hub !== tempHub) return;	// If we already found a hub, stop

			self.hub = findHub(baseModule, source);
			if (!self.hub) {
				self.hub = new hubs.StubHub();
				logger.trace("Couldn't find LogUp hub after tick; falling back to built-in stub");
			}
			self.hub.attach(self);
			tempHub.emitTo(self.hub);
		};

		process.nextTick(ensureHub);
		process.on('exit', ensureHub);	// In case the process exits during the first tick, deliver logs anyway
	}
	this.hub.attach(this);
	this.checkLevel();
}

util.mixin(Logger.prototype, require('./logger-api'));

/**
 * Called by the hub (or indirectly through a proxy) to broadcast a message to all loggers
 * @param {String}	name			The name of the broadcast method to invoke
 * @param {String}	versionRange	A semver range string indicating which protocol versions this message is intended for.
 * @param {Array}	args			The arguments to pass to the method
 */
Logger.prototype.onBroadcast = function (name, versionRange, args) {
	// Ignore broadcasts targeting other versions.
	if (!semver.satisfies(this.protocolVersion, versionRange))
		return;
	this['on-' + name].apply(this, args);
};
Logger.prototype['on-configChanged'] = Logger.prototype.checkLevel;

// This must be created after Logger.prototype is fully set up
var logger = require('../').createLogger(module);