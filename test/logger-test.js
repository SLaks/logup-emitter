/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
/*global describe:false, it:false, mocha: false */
"use strict";

require("es5-shim");			// For Array.prototype.forEach()
require("es5-shim/es5-sham");	// For Object.getOwnPropertyDescriptors()
var expect = require('expect.js');

var testUtils = require('./utils');

/**
 * Creates a new logger on a module loaded by the current module.
 */
function getChildLogger() {
	// I need a separate exporting file for each test
	// file, since module.parent is only set once.
	return require('./fixtures/export-emitter-logger')();
}

describe('Logger', function () {
	describe('.describe', function () {
		it('should accept string and value', function () {
			var logger = require('..').createLogger(module);
			logger.describe("area", "admin");
			expect(logger.source).to.have.property('area', 'admin');
		});
		it('should accept object', function () {
			var logger = require('..').createLogger(module);
			logger.describe({ area: "admin", type: "performance" });
			expect(logger.source).to.have.property('area', 'admin');
			expect(logger.source).to.have.property('type', 'performance');
		});

		it('should reject packageInfo property', function () {
			var logger = require('..').createLogger(module);
			expect(
				logger.describe.bind(logger, { packageInfo: { stability: 9 } })
			).to.throwException();
		});

		it('should reject filename property', function () {
			var logger = require('..').createLogger(module);
			expect(
				logger.describe.bind(logger, "filename", __filename)
			).to.throwException();
		});
	});
	describe(".log", function () {
		it("should pass undefined if no third argument", function () {
			var hub = new testUtils.CollectingHub('info');
			hub.install(module);
			var logger = getChildLogger();

			logger.info("Hi!");

			expect(hub.messages.info[0].data).to.be(undefined);

			hub.uninstall();
		});
		it("should combine extra data arguments into an array", function () {
			var hub = new testUtils.CollectingHub('info');
			hub.install(module);
			var logger = getChildLogger();

			logger.info("Hi!", 1, 2);

			expect(hub.messages.info[0].data).to.eql([1, 2, ]);

			hub.uninstall();
		});
	});
});