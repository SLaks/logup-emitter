/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
/*global describe:false, it:false */
"use strict";

var mocha = require("mocha");
var expect = require('expect.js');

var CollectingHub = require('./utils/CollectingHub');

describe("Logger.source", function () {
	describe("when in a node_module", function () {
		it("should find the package.json", function () {
			var logger = require('./fixtures/node_modules/library');
			expect(logger.source.packageInfo).to.eql({
				"name": "library",
				"version": "0.0.0",
				"main": "lib/index.js"
			});
		});
	});
});