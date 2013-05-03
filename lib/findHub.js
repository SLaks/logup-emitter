/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

/**
 * Finds the nearest installed LogUp hub upstream of a given module.
 * @param {Module}	baseModule	The module object to begin the search from.
 */
module.exports = function findHub(baseModule) {
	// Browserify doesn't support module.parent at
	// all.  Check for that on our module, in case
	// the caller's module is actually the root.
	if (!module.parent) {
		return global['logup-hub'] || null;
	}

	var level = { parent: baseModule };

	while (!!(level = level.parent)) {
		var hub = level['logup-hub'];
		if (!hub) continue;
		if (hub.isActive && !hub.isActive())
			continue;
		return hub;
	}
	return null;
};