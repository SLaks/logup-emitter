/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

var semver = require('semver');
var logger = require('../').createLogger(module);

var hubs = require('./hubs');
var findHub = require('./findHub');

// This private constructor is wrapper by createLogger()
// and createSubpackageLogger() in index.js.  baseModule
// is only used to locate a hub; source is passed to the
// hub to identify output from this logger.
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
			tempHub.emitTo(self.hub);
		});
	}
	this.hub.attach(this);
	this.checkLevel();
}

/**
 * Asks the current hub what level of messages this logger should emit.
 */
Logger.prototype.checkLevel = function () {
	var self = this;
	this.hub.invoke("checkLevel", [
		this.source,
		{ setLevel: function (level) { self.minLevel = level; } }
	]);
};

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

/**
 * Creates a wrapper around this logger that uses different level names.
 */
Logger.prototype.mapLevels = function (levelMap) {
	var parent = this;
	var retVal = {};

	//TODO: Attach context methods

	function createForwarder(level) {
		var value = levelMap[level];
		return function () {
			var args = [value];
			args.push.apply(args, arguments);
			return parent.log.apply(parent, args);
		};
	}
	for (var level in levelMap) {
		if (levelMap.hasOwnProperty(level))
			retVal[level] = createForwarder(level);
	}

	if (!levelMap.hasOwnProperty("log")) {
		retVal.log = function (level) {
			var args = Array.prototype.slice.call(arguments);
			args[0] = levelMap[level] || level;
			return parent.log.apply(parent, args);
		};
	}

	return retVal;
};