#!/usr/bin/env node

var fs = require('fs'),
	program = require('commander'),
	package = require('./package.json')

program
	.version(package.version)
	.option('--poll-firstup <n>', 'First poll interval after tunnel started', parseInt, 5000)
	.option('--poll-interval <n>', 'Poll interval', parseInt, 2000)
	.option('--poll-max-interval <n>', 'Max poll interval when retrying', parseInt, 30000)
	.option('--poll-timeout <n>', 'Timeout for the request', parseInt, 10000)
	.option('--poll-target <value>', 'Http server address and port like www.google.com:80', x => x, 'www.google.com:80')
	.option('--daemon-name <value>', 'The pm2 task name for ssh', x => x, 'ssht')
	.option('--daemon-args <args>', 'Arguments passed to ssh')
	.option('-c, --config-file <path>', 'A JSON file containing the arguments. The keys should be in camelCase style')
	.parse(process.argv)

if (program.configFile) {
	Object.assign(program, JSON.parse(fs.readFileSync(program.configFile)))
	program.parse(process.argv)
}

if (!program.daemonArgs) {
	program.outputHelp()
	process.exit(-1)
}

var pm2 = require('pm2'),
	request = require('request'),
	promisify = require('es6-promisify'),
	portfinder = require('portfinder'),
	log4js = require('log4js'),
	co = require('co')

'connect|disconnect|start|delete|restart'.split('|')
	.forEach(fn => pm2['$' + fn] = promisify(pm2[fn].bind(pm2)))

var $request = promisify(request),
	logger = log4js.getLogger()

var nextPollInterval = program.pollInterval

var start = port => function *() {
	yield pm2.$connect()

	try {
		yield pm2.$delete(program.daemonName)
	}
	catch (e) {
		// do nothing
	}

	yield pm2.$start({
		name: program.daemonName,
		args: program.daemonArgs + ' -L 127.0.0.1:' + port + ':' + program.pollTarget,
		script: 'ssh',
		interpreter: 'none',
	})
	logger.info('tunnel started')

	yield pm2.$disconnect()

	setTimeout(() => co(poll(port)), program.pollFirstup)
}

var poll = port => function *() {
	yield pm2.$connect()

	try {
		yield $request({
			url: 'http://127.0.0.1:' + port + '/haruhara-haruko-atomsk',
			timeout: program.pollTimeout
		})
		logger.info('tunnel via port ' + port + ' ok')
		nextPollInterval = program.pollInterval
	}
	catch (e) {
		logger.warn(e.message)
		yield pm2.$restart(program.daemonName)
		logger.info('tunnel restarted')
		nextPollInterval = nextPollInterval > program.pollInterval ? 
			// if it has failed for many times before, use a larger poll interval every time
			Math.min(nextPollInterval + 2000, program.pollMaxInterval) : program.pollFirstup
	}

	yield pm2.$disconnect()

	setTimeout(() => co(poll(port)), nextPollInterval)
}

portfinder.basePort = Math.floor(Math.random() * 10000) + 10000
portfinder.getPort((err, port) => {
	if (port > 0)
		setTimeout(() => co(start(port)), Math.random() * 1000)
	else
		console.error(err || 'no available port now')
})
