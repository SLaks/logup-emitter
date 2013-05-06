/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

// This file contains the core communication layer
// for all emitters (loggers, downstream proxies).

var semver = require('semver');

var util = require('./util');
var QueuingHub = require('./QueuingHub');
var StubHub = require('./StubHub');
var findHub = require('./findHub');
var onExit = require('./onExit');

function Emitter(baseModule) {
	this.protocolVersion = require('../package.json').protocolVersion;
	this.hub = findHub(baseModule);

	if (!this.hub) {
		// When we create this file's logger, it won't exist yet.
		logger && logger.trace("Couldn't find LogUp hub; falling back to QueuingHub until next tick");
		var self = this;
		var tempHub = this.hub = new QueuingHub();

		var ensureHub = function () {
			onExit.unrun(ensureHub);
			if (self.hub !== tempHub) return;	// If we already found a hub, stop

			self.hub = findHub(baseModule);
			if (!self.hub) {
				self.hub = new StubHub();
				logger.trace("Couldn't find LogUp hub after tick; falling back to built-in stub");
			}
			self.hub.attach(self);
			tempHub.emitTo(self.hub);
		};

		process.nextTick(ensureHub);
		onExit.run(ensureHub);		// In case the process exits during the first tick, deliver logs anyway
	}
	this.hub.attach(this);
}

/**
 * Called by the hub (or indirectly through a proxy) to broadcast a message to all loggers
 * @param {String}	name			The name of the broadcast method to invoke
 * @param {String}	versionRange	A semver range string indicating which protocol versions this message is intended for.
 * @param {Array}	args			The arguments to pass to the method
 */
Emitter.prototype.onBroadcast = function (name, versionRange, args) {
	// Ignore broadcasts targeting other versions.
	if (!semver.satisfies(this.protocolVersion, versionRange))
		return;
	this['on-' + name].apply(this, args);
};

module.exports = Emitter;

// We can only make a logger after Emitter.prototype
// and exports are fully set up, because it inherits
// us.
var logger = require('../').createLogger(module);