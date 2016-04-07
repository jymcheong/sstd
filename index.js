var pm2 = require('pm2'),
	request = require('request'),
	promisify = require('es6-promisify'),
	portfinder = require('portfinder'),
	log4js = require('log4js'),
	co = require('co')

'connect|disconnect|start|delete|restart'.split('|')
	.forEach(fn => pm2['$' + fn] = promisify(pm2[fn].bind(pm2)))

var $request = promisify(request),
	$findport = promisify(portfinder.getPort.bind(portfinder)),
	logger = log4js.getLogger()

module.exports = function(config) {
	var nextPollInterval = config.pollInterval,
		listenPort = 0

	var $start = function *() {
		yield pm2.$connect()

		try {
			yield pm2.$delete(config.daemonName)
		}
		catch (e) {
			// do nothing
		}

		yield pm2.$start({
			name: config.daemonName,
			args: config.daemonArgs + ' -L 127.0.0.1:' + listenPort + ':' + config.pollTarget,
			script: 'ssh',
			interpreter: 'none',
		})
		logger.info('tunnel started at port ' + listenPort)

		yield pm2.$disconnect()

		setTimeout(() => co($poll), config.pollFirstup)
	}

	var $poll = function *() {
		try {
			yield $request({
				url: 'http://127.0.0.1:' + listenPort + '/haruhara-haruko-atomsk',
				timeout: config.pollTimeout
			})
			logger.info('tunnel via port ' + listenPort + ' ok')
			nextPollInterval = config.pollInterval
		}
		catch (e) {
			logger.warn(e.message)
			yield pm2.$connect()
			yield pm2.$restart(config.daemonName)
			yield pm2.$disconnect()
			logger.info('tunnel restarted')
			nextPollInterval = nextPollInterval > config.pollInterval ? 
				// if it has failed for many times before, use a larger poll interval every time
				Math.min(nextPollInterval + 2000, config.pollMaxInterval) : config.pollFirstup
		}

		setTimeout(() => co($poll), nextPollInterval)
	}

	return co(function *() {
		portfinder.basePort = Math.floor(Math.random() * 10000) + 10000
		listenPort = yield $findport()
		yield $start()
	})
}
