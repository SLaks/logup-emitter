/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

var fs = require('fs');
var exec = require('child_process').exec;

exports.CollectingHub = require('./CollectingHub');

/**
 * Runs the source in the code function in a separate process.
 * This should be called sparingly, since it can't work within
 * browserify.
 */
exports.runProcess = function runProcess(code, cb) {
	if (typeof code !== 'function' || code.length !== 0)
		throw new Error("code must be a function with no parameters");
	var source = "(\n" + code.toString() + "\n)();";

	var filename = __dirname + "/../runProcess-temp-" + process.pid + "-" + (runProcess.counter = (runProcess.counter || 0) + 1) + ".js";
	fs.writeFile(filename, source, "utf8", function (err) {
		if (err) {
			fs.unlink(filename);
			return cb(err);
		}
		exec('node "' + filename + '"', function () {
			fs.unlink(filename);
			cb.apply(this, arguments);
		});
	});
};
