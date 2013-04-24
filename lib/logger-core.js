/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

// This file contains the core communication layer for Logger objects

var semver = require('semver');
var logger = require('../').createLogger(module);

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
		logger.trace("Couldn't find LogUp hub; falling back to QueuingHub until next tick");
		var self = this;
		var tempHub = this.hub = new hubs.QueuingHub();
		process.nextTick(function () {
			self.hub = findHub(baseModule, source);
			if (!self.hub) {
				logger.trace("Couldn't find LogUp hub after tick; falling back to built-in stub");
				self.hub = new hubs.StubHub();
			}
			self.hub.attach(self);
			tempHub.emitTo(self.hub);
		});
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