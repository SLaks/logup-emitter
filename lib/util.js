/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

exports.mixin = function mixin(target, additional) {
	for (var key in additional) {
		target[key] = additional[key];
	}
};