/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

// This hub is used before a real upstream hub can be found.
// It is never installed on any module, so it can't be found
// by other loggers.  Thus, we don't care about versions.


/**
 * A placeholder hub that queues all incoming invocations until a more permanent hub is available.
 */
var QueuingHub = module.exports = function QueuingHub() {
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