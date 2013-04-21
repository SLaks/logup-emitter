/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

/**
 * Finds the nearest installed LogUp hub upstream of a given module.
 * @param {Module}	baseModule	The module object to begin the search from.
 * @param {Object}	source		The logger source object to pass to hub.isActive().
 */
module.exports = function findHub(baseModule, source) {
	var level = { parent: baseModule };

	while (!!(level = level.parent)) {
		var hub = level['logup-hub'];
		if (!hub) continue;
		if (hub.isActive && !hub.isActive(source))
			continue;
		return hub;
	}
	return null;
};