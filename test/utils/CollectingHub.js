/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

// This file contains hubs that are used when a real upstream hub cannot be found.
// None of these hubs are ever installed on any module, so they cannot be found by
// other loggers.  Thus, there are no versioning considerations here.

var levels = require('../..').levels;

/**
 * A simple logging hub that collects all emitted logs in arrays.
 */
var CollectingHub = module.exports = function CollectingHub(minLevel) {
	this.minLevel = levels.values[minLevel];
	this.messages = {};
	this.attachedEmitters = [];
	for (var i = 0; i < levels.names.length; i++) {
		this.messages[levels.names[i]] = [];
	}
};

/**
 * Installs this hub onto a module.
 */
CollectingHub.prototype.install = function (targetModule) {
	// Browserify doesn't support module.parent at
	// all.  Check for that on our module, in case
	// the caller's module is actually the root.
	if (!module.parent) {
		targetModule = global;
	}

	if (targetModule['logup-hub'] !== void 0)
		throw new Error("Module " + targetModule.id + " already has a LogUp hub installed");
	targetModule['logup-hub'] = this;
	this.module = targetModule;
};
/**
 * Uninstalls this hub from the module it was installed on.
 */
CollectingHub.prototype.uninstall = function () {
	if (!this.module || this.module['logup-hub'] !== this)
		throw new Error("This hub is not installed");

	try {
		delete this.module['logup-hub'];
	} catch (e) {
		this.module['logup-hub'] = void 0;	// Workaround for IE8 bug when deleting from window (if no module.parent)
	}
	delete this.module;
};

/**
 * Attaches a log emitter to this hub.
 */
CollectingHub.prototype.attach = function (emitter) {
	this.attachedEmitters.push(emitter);
};

/**
 * Invokes a method on the hub.
 */
CollectingHub.prototype.invoke = function (method, args) {
	this[method].apply(this, args);
};
// The following methods are called by invoke():
CollectingHub.prototype.checkLevel = function (source, e) {
	e.respond(this.minLevel);
};

CollectingHub.prototype.log = function (source, level, timestamp, message, data) {
	if (levels.values[level] < this.minLevel)
		return;
	this.messages[level].push({
		source: source,
		timestamp: timestamp,
		message: message,
		data: data
	});
};