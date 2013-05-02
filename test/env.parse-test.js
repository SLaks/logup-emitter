/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
/*global describe:false, it:false, mocha: false */
"use strict";

var expect = require('expect.js');

var env = require('..').defaults;
var levels = require('..').levels;

describe('env.parse', function () {
	it('should return an empty object when passed empty', function () {
		expect(env.parse('')).to.eql({ all: 999, packages: {} });
	});

	it('should set all correctly', function () {
		expect(env.parse('*:info')).to.eql({ all: levels.values.info, packages: {} });
	});
	it('should set all to last value', function () {
		expect(env.parse('*:info, *:warn')).to.eql({ all: levels.values.warn, packages: {} });
	});

	it('should set only specific packages', function () {
		expect(env.parse('lib1: trace,lib2:warn')).to.eql({ all: 999, packages: { lib1: levels.values.trace, lib2: levels.values.warn } });
	});

	it('should set specific packages with *', function () {
		expect(env.parse('lib1: trace,lib2:warn, *: error')).to.eql({ all: levels.values.error, packages: { lib1: levels.values.trace, lib2: levels.values.warn } });
	});

	describe('.forPackage', function () {
		var values = env.parse('lib1: trace, lib2: warn, *: error');
		it('should return values set for specific packages', function () {
			expect(values.forPackage("lib1")).to.be(levels.values.trace);
			expect(values.forPackage("lib2")).to.be(levels.values.warn);
		});
		it('should return * for packages', function () {
			expect(values.forPackage("lib1.thingy")).to.be(levels.values.error);
			expect(values.forPackage("util")).to.be(levels.values.error);
		});
	});
});