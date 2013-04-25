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
	this.attachedEmitters = []
	for (var i = 0; i < levels.names.length; i++) {
		this.messages[levels.names[i]] = [];
	}
};

/**
 * Installs this hub onto a module.
 */
CollectingHub.prototype.install = function (module) {
	this.module = module;
	module['logup-hub'] = this;
}
/**
 * Uninstalls this hub from the module it was installed on.
 */
CollectingHub.prototype.uninstall = function () {
	if (!this.module || this.module['logup-hub'] !== this)
		throw new Error("Not installed");
	delete this.module['logup-hub'];
	delete this.module;
}

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
