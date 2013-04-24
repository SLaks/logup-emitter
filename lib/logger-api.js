/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

// This file contains the public API methods of Logger objects.
// It is merged into Logger.prototype by logger-core.js.

var levels = require('./levels');

module.exports = {
	/**
	 * Asks the current hub what level of messages this logger should emit.
	 */
	checkLevel: function () {
		var self = this;
		this.hub.invoke("checkLevel", [
			this.source,
			{
				respond: function (level) {
					if (typeof level === 'string')
						level = levels.values[level];
					self.minLevel = level || 0;
				}
			}
		]);
	},
	/**
	 * Associates contextual information with the current asynchronous callchain.
	 * Whether and how this is supported is up to the hub.
	 */
	addContext: function (key, value) {
		if (!key)
			throw new Error('Invalid usage of addContext().  Must be called as addContext("key", value) or addContext(map)');

		var obj;
		if (typeof key === 'object') {
			if (arguments.length !== 1)
				throw new Error('Invalid usage of addContext().  Must be called as addContext("key", value) or addContext(map)');
			obj = key;
		} else {
			if (arguments.length !== 2 || typeof key !== 'string')
				throw new Error('Invalid usage of addContext().  Must be called as addContext("key", value) or addContext(map)');
			obj = {};
			obj[key] = value;
		}
		this.hub.invoke('addContext', [this.source, obj]);
	},

	/**
	 * Creates a wrapper around this logger that uses different level names.
	 * @param {Object}	levelMap	An object mapping new level names to existing level names.
	 */
	mapLevels: function (levelMap) {
		var parent = this;
		var retVal = {};

		retVal.addContext = parent.addContext.bind(parent);
		retVal.mapLevels = parent.mapLevels;

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
	},

	/**
	 * Emits a log message to the attached hub.
	 * @param {String}	level	The log level to emit at.  This can also be the index of a known log level.
	 * @param {String}	message	The message to emit
	 * @param {Object}	detail	An optional JSON object containing additional detail about the event.
	 */
	log: function (level, message, detail) {
		// As an undocumented feature, I forward unrecognized
		// level names to the hub, regardless of our minLevel
		var args;
		if (typeof level === 'number') {
			if (level < this.minLevel)
				return;
			args = [this.source, levels.names[level] || level.toString()];
		} else {
			if (!level) level = "info";
			if (levels.values[level] < this.minLevel)
				return;
			args = [this.source, level];
		}

		args.push.apply(args, arguments);
		args[2] = Date.now();	// Overwrite the extra copy of level from arguments
		this.hub.invoke("log", args);
	}
};

levels.names.forEach(function (name, index) {
	module.exports[name] = function () {
		if (index < this.minLevel)
			return;

		var args = [index];
		args.push.apply(args, arguments);
		return this.log.apply(this, args);
	};
});