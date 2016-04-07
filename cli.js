#!/usr/bin/env node

var fs = require('fs'),
	program = require('commander'),
	co = require('co'),
	package = require('./package.json'),
	sstd = require('./index')

var defaultConfig = {
	pollFirstup: 5000,
	pollInterval: 2000,
	pollMaxInterval: 30000,
	pollTimeout: 10000,
	pollTarget: 'www.google.com:80',
	daemonName: 'sstd-ssh',
}

program
	.version(package.version)
	.option('--poll-firstup <n>', 'First poll interval after tunnel started',
		parseInt, defaultConfig.pollFirstup)
	.option('--poll-interval <n>', 'Poll interval',
		parseInt, defaultConfig.pollInterval)
	.option('--poll-max-interval <n>', 'Max poll interval when retrying',
		parseInt, defaultConfig.pollMaxInterval)
	.option('--poll-timeout <n>', 'Timeout for the request',
		parseInt, defaultConfig.pollTimeout)
	.option('--poll-target <value>', 'Http server address and port like www.google.com:80',
		x => x, defaultConfig.pollTarget)
	.option('--daemon-name <value>', 'The pm2 task name for ssh',
		x => x, defaultConfig.daemonName)
	.option('--daemon-args <args>', 'Arguments passed to ssh')
	.option('-c, --config-file <path>', 'A JSON file containing the arguments or array of them. The keys should be in camelCase style')
	.parse(process.argv)

if (program.configFile) {
	var json = JSON.parse(fs.readFileSync(program.configFile)),
		configs = Array.isArray(json) ? json : [json]
	configs
		.filter(c => c.daemonArgs)
		.map((c, i) => Object.assign({ daemonName:'sstd-ssh' + i }, defaultConfig, c))
		.reduce((p, c) => p.then(() => sstd(c)), Promise.resolve())
}
else if (program.daemonArgs) {
	sstd(program)
}
else {
	program.outputHelp()
	process.exit(-1)
}
