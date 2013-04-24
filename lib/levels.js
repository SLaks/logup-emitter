exports.names = [
	 "trace",
	 "debug",
	 "info",
	 "warn",
	 "error"
];

exports.values = {};
for (var i = 0; i < exports.names.length; i++) {
	exports.values[exports.names[i]] = i;
}