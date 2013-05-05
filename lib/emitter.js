/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

// This file contains the core communication layer
// for all emitters (loggers, downstream proxies).

var semver = require('semver');

var util = require('./util');
var QueuingHub = require('./QueuingHub');
var StubHub = require('./StubHub');
var findHub = require('./findHub');

function Emitter(baseModule) {
	this.protocolVersion = require('../package.json').protocolVersion;
	this.hub = findHub(baseModule);

	if (!this.hub) {
		// When we create this file's logger, it won't exist yet.
		logger && logger.trace("Couldn't find LogUp hub; falling back to QueuingHub until next tick");
		var self = this;
		var tempHub = this.hub = new QueuingHub();

		// Browserify's process doesn't implement EventEmitter
		var ensureHub = function () {
			process.removeListener('uncaughtException', ensureHub);
			process.removeListener('exit', ensureHub);
			if (self.hub !== tempHub) return;	// If we already found a hub, stop

			self.hub = findHub(baseModule);
			if (!self.hub) {
				self.hub = new StubHub();
				logger.trace("Couldn't find LogUp hub after tick; falling back to built-in stub");
			}
			self.hub.attach(self);
			tempHub.emitTo(self.hub);
		};

		// XXX https://github.com/joyent/node/issues/3555
		// Inspired by isaacs/lockfile
		var onException = function logUpExitListener(err) {
			// If there are multiple copies of the emitter
			// package in the process, make sure that they
			// all run this handler.
			var allListeners = process.listeners('uncaughtException');
			var logUpListeners = allListeners.filter(function (h) { return h['logup-emitter-exit-listener']; });

			if (arguments.length === 0) {
				ensureHub();
				return;
			}

			// If we are the first listener, invoke
			// the listeners for every logger.
			try {
				for (var i = 0; i < logUpListeners.length; i++) {
					logUpListeners[i]();
				}
			} catch (e) { console.error(e); }

			// If there is a different listener, assume
			// it handled the error, and don't rethrow.
			if (logUpListeners.length === allListeners.length)
				throw err;
		};
		onException['logup-emitter-exit-listener'] = true;

		process.nextTick(ensureHub);
		if (!process.browser) {
			process.on('exit', ensureHub);	// In case the process exits during the first tick, deliver logs anyway
			process.on('uncaughtException', onException);	// In case the process exits during the first tick, deliver logs anyway
		}
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