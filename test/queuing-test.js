/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
/*global describe:false, it:false */
"use strict";

var mocha = require("mocha");
var expect = require('expect.js');

var fs = require('fs');
var exec = require('child_process').exec;

/**
 * Runs the source in the code function in a separate process.
 * This should be called sparingly, since it can't work within
 * browserify.
 */
function runProcess(code, cb) {
	if (typeof code !== 'function' || code.length !== 0)
		throw new Error("code must be a function with no parameters");
	var source = "(\n" + code.toString() + "\n)();";

	var filename = __dirname + "/runProcess-temp-" + process.pid + "-" + (runProcess.counter = (runProcess.counter || 0) + 1) + ".js";
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
}

describe("Logger", function () {
	describe("when there is no hub", function () {
		// All of these tests work by starting a new process
		// and reading the output after it exits. This can't
		// be done in browserify.
		if (process.browser) return;
		describe("when the entire process is synchronous", function () {
			it("should write logged messages to stderr on exit", function (done) {
				runProcess(
					function () {
						var logger = require('..').createLogger(module);
						logger.info("Line 1");
						console.error("Line 2");
						logger.warn("Line 3");
					},
					function (err, stdout, stderr) {
						if (err) return done(err);
						expect(stdout.length).to.be(0);
						expect(stderr.toString()).to.match(/.*Line 2\n.*Line 1\n.*Line 3\n$/);
						done();
					}
				);
			});
		});
		describe("when another tick occurs", function () {
			it("should write logged messages to stderr after nextTick", function (done) {
				runProcess(
					function () {
						var logger = require('..').createLogger(module);
						logger.info("Line 1");
						console.error("Line 2");
						logger.warn("Line 3");
						process.nextTick(function () {
							logger.error("Line 4");
							console.error("Line 5");
						});
					},
					function (err, stdout, stderr) {
						if (err) return done(err);
						expect(stdout.length).to.be(0);
						expect(stderr.toString()).to.match(/.*Line 2\n.*Line 1\n.*Line 3\n.*Line 4\n.*Line 5\n$/);
						done();
					}
				);
			});
		});

		// process.exit() doesn't flush pending IOs, so this appears to be
		// impossible to test.  https://github.com/joyent/node/issues/3737
		describe.skip("when the process.exit is called", function () {
			it("should write logged messages to stderr on exit", function (done) {
				runProcess(
					function () {
						var logger = require('..').createLogger(module);
						logger.info("Line 1");
						console.error("Line 2");
						logger.warn("Line 3");
						process.exit();
						logger.info("After exit!");
					},
					function (err, stdout, stderr) {
						if (err) return done(err);
						expect(stdout.length).to.be(0);
						expect(stderr.toString()).to.match(/.*Line 2\n.*Line 1\n.*Line 3\n$/);
						done();
					}
				);
			});
		});
	});
});