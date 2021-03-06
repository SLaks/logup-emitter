/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

// This hub is used when a real upstream hub cannot be found.
// It is never installed on any module, so it cannot be found
// by other loggers.  Thus, we don't care about versions.

var levels = require('./levels');
var util = require('./util');
var levelSet = require('./level-set');

/**
 * A simple logging hub that is used if no host could be found.
 */
var StubHub = module.exports = function StubHub() {
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
	e.respond(levelSet.env.forPackage(source.packageInfo.name));
};

if (process.browser) {
	var consoleMethods = {
		all: "debug",	// In Chrome, console.debug (only) adds an icon.  In Firebug, console.info (only) adds an icon.  I choose Chrome
		warn: 'warn',
		error: 'error'
	};
	StubHub.prototype.log = function (source, level, timestamp, message, data) {
		if (levels.values[level] < levelSet.env.forPackage(source.packageInfo.name))
			return;

		var args = [
			level,
			new Date(timestamp).toISOString(),
			util.sourceLabel(source),
			message
		];

		if (typeof data !== "undefined")
			args.push(data);

		console[consoleMethods[level] || consoleMethods.all].apply(console, args);
	};
} else {
	StubHub.prototype.log = function (source, level, timestamp, message, data) {
		if (levels.values[level] < levelSet.env.forPackage(source.packageInfo.name))
			return;

		// TODO: Colorize prefixes
		var args = [
			level,
			new Date(timestamp).toISOString(),
			util.sourceLabel(source),
			message
		];

		if (typeof data !== "undefined")
			args.push(util.inspect(data, { colors: true }));

		console.error.apply(console, args);
	};
}