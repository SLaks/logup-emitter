/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

// This file contains hubs that are used when a real upstream hub cannot be found.
// None of these hubs are ever installed on any module, so they cannot be found by
// other loggers.  Thus, there are no versioning considerations here.

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
StubHub.prototype.log = function (source, timestamp, message, data) {

};
