/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

// This file contains hubs that are used when a real upstream hub cannot be found.
// None of these hubs are ever installed on any module, so they cannot be found by
// other loggers.  Thus, there are no versioning considerations here.

var levels = require('./levels');
var util = require('./util');

/**
 * A placeholder hub that queues all incoming invocations until a more permanent hub is available.
 */
var QueuingHub = exports.QueuingHub = function QueuingHub() {
};
/**
 * Attaches a log emitter to this hub.
 * Queuing hubs don't need to do anything here.
 */
QueuingHub.prototype.attach = function (emitter) { };

/**
 * Invokes a method on the hub.
 * Queuing hubs simply queue the invocations until a real hub is available.
 */
QueuingHub.prototype.invoke = function (method, args) {
	if (!this.queue) this.queue = [];
	this.queue.push(arguments);
};

/**
 * Forwards all queued invocations to a different hub.
 */
QueuingHub.prototype.emitTo = function (targetHub) {
	if (!this.queue) return;
	for (var i = 0; i < this.queue.length; i++) {
		targetHub.invoke.apply(targetHub, this.queue[i]);
	}
};


/**
 * A simple logging hub that is used if no host could be found.
 */
var StubHub = exports.StubHub = function StubHub() {
	this.minLevel = levels.values.info;
};
/**
 * Attaches a log emitter to this hub.
 * Stub hubs don't need to do anything here.
 */
StubHub.prototype.attach = function (emitter) { };

/**
 * Invokes a method on the hub.
 */
StubHub.prototype.invoke = function (method, args) {
	this[method].apply(this, args);
};
// The following methods are called by invoke():
StubHub.prototype.checkLevel = function (source, e) {
	e.respond(this.minLevel);
};

// TODO: Format Error instances correctly
if (process.browser) {
	var consoleMethods = {
		"default": "debug",	// In Chrome, console.debug (only) adds an icon.  In Firebug, console.info (only) adds an icon.  I choose Chrome
		warn: 'warn',
		error: 'error'
	};
	StubHub.prototype.log = function (source, level, timestamp, message, data) {
		if (levels.values[level] < this.minLevel)
			return;

		var args = [
			level,
			new Date(timestamp).toISOString(),
			source.packageInfo.name + "/" + (source.filename ? util.displayName(source.filename) : "?"),
			message
		];

		// If there are multiple data arguments, combine them into an array
		if (arguments.length > 5)
			args.push.apply(Array.prototype.slice.call(arguments, 4));
		else if (arguments.length === 5)
			args.push(data);
		console[consoleMethods[level] || consoleMethods.default].apply(console, args);
	};
} else {
	StubHub.prototype.log = function (source, level, timestamp, message, data) {
		if (levels.values[level] < this.minLevel)
			return;

		// TODO: Colorize prefixes
		var args = [
			level,
			new Date(timestamp).toISOString(),
			source.packageInfo.name + "/" + (source.filename ? util.displayName(source.filename) : "?"),
			message
		];

		// If there are multiple data arguments, combine them into an array
		if (arguments.length > 5)
			data = Array.prototype.slice.call(arguments, 4);
		// After normalizing data, prepare it for console output
		if (arguments.length > 4)
			args.push(util.inspect(data, { colors: true }));

		console.error.apply(console, args);
	};
}