/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

// This hub is used when a real upstream hub cannot be found.
// It is never installed on any module, so it cannot be found
// by other loggers.  Thus, we don't care about versions.

var levels = require('./levels');
var util = require('./util');

/**
 * A simple logging hub that is used if no host could be found.
 */
var StubHub = module.exports = function StubHub() {
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
			util.sourceLabel(source),
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
			util.sourceLabel(source),
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