/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

var callbacks = null;

function setup() {
	if (callbacks)
		return;
	callbacks = [];

	process.on('exit', runCallbacks);	// In case the process exits during the first tick, deliver logs anyway
	process.on('uncaughtException', onException);	// In case the process exits during the first tick, deliver logs anyway
}
function unsetup() {
	process.removeListener('uncaughtException', onException);
	process.removeListener('exit', runCallbacks);
	callbacks = null;
}

exports.run = function (cb) {
	setup();
	callbacks.push(cb);
};
exports.unrun = function (cb) {
	if (!callbacks) return;
	for (var i = 0; i < callbacks.length; i++) {
		if (callbacks[i] === cb)
			callbacks.splice(i, 1);
	}

	// If we removed the last callback, clear everything to save memory.
	if (callbacks.length === 0)
		unsetup();
};


function runCallbacks() {
	var cbs = callbacks;
	unsetup();
	cbs.forEach(Function.call.bind(Function.call));
}

// XXX https://github.com/joyent/node/issues/3555
// Inspired by isaacs/lockfile
var onException = function onException(err) {
	// If there are multiple copies of the emitter
	// package in the process, make sure that they
	// all run this handler.
	var allListeners = process.listeners('uncaughtException');
	var logUpListeners = allListeners.filter(function (h) { return h['logup-exit-listener']; });

	if (arguments.length === 0) {
		// If we're being invoked directly by a different handler, just run and return.
		runCallbacks();
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
onException['logup-exit-listener'] = true;

if (process.browser) {
	exports.unrun = exports.run = function () { };
}