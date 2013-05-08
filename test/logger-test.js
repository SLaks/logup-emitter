/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
/*global describe:false, it:false, mocha: false */
"use strict";

require("es5-shim");			// For Array.prototype.forEach()
require("es5-shim/es5-sham");	// For Object.getOwnPropertyDescriptors()
var expect = require('expect.js');


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
});