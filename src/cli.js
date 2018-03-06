#!/usr/bin/env node
const {
  examplesDecorator,
  middlewaresDecorator
} = require('./decorators')
const {
  reporterMiddleware,
  manifestMiddleware,
  moduleMiddleware
} = require('./middleware')
const {
  findProjectRoot
} = require('./util')

const MIDDLEWARES = [
  reporterMiddleware,
  manifestMiddleware,
  moduleMiddleware
]

const DECORATORS = [
  examplesDecorator,
  middlewaresDecorator(MIDDLEWARES)
]

// Set up commands
const cmd = require('yargs')
  .commandDir('./commands', {
    visit: (cmd) => {
      // Decorates the command with new aspects (does not touch `argv`)
      cmd = DECORATORS.reduce(
        (innerCmd, decorator) => decorator(innerCmd),
        cmd
      )

      // Wrap command handler
      const _handler = cmd.handler
      cmd.handler = (argv) => {
        // Handle errors
        _handler(argv.reporter, argv)
          .then((exitCode = 0) => {
            process.exitCode = exitCode
          })
          .catch((err) => {
            argv.reporter.error(err.message)
            argv.reporter.debug(err.stack)
            process.exitCode = 1
          })
      }

      return cmd
    }
  })

// Configure CLI behaviour
cmd.demandCommand()

// Set global options
cmd.option('silent', {
  description: 'Silence output to terminal',
  default: false
})
cmd.option('cwd', {
  description: 'The project working directory',
  default: () => {
    try {
      return findProjectRoot()
    } catch (_) {
      return process.cwd()
    }
  }
})

// APM
cmd.option('apm.ensRegistry', {
  description: 'Address of the ENS registry',
  default: '0x2e0ecaae14bc77001ba0c0c2500c60af1e12c980'
})
cmd.group(['apm.ens-registry', 'eth-rpc'], 'APM:')

cmd.option('apm.ipfs.rpc', {
  description: 'An URI to the IPFS node used to publish files',
  default: {
    host: 'localhost',
    protocol: 'http',
    port: 5001
  }
})
cmd.group('apm.ipfs.rpc', 'APM providers:')

// Ethereum
cmd.option('eth-rpc', {
  description: 'An URI to the Ethereum node used for RPC calls',
  default: 'http://localhost:8545',
})

cmd.option('keyfile', {
  description: 'Path to a local file containing a private key and rpc node',
  default: require('homedir')()+'/.localkey.json',
  coerce: (file) => {
    try {
      return require(file)
    } catch (e) {
      return null
    }
  }
})


// Add epilogue
cmd.epilogue('For more information, check out https://wiki.aragon.one')

// Run
cmd.argv // eslint-disable-line
