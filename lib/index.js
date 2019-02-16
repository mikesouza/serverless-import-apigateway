'use strict'

const chalk = require('chalk')

class ImportApiGatewayPlugin {
  constructor(serverless, options) {
    this.serverless = serverless

    this.provider = this.serverless.providers.aws
    this.config = this.serverless.service.custom && this.serverless.service.custom['importApiGateway']

    this.hooks = {
      'before:package:setupProviderConfiguration': this.importApiGateway.bind(this)
    };
  }

  async findRestApiResource(restApiId, path) {
    const response = await this.provider.request('APIGateway', 'getResources', { limit: 500, restApiId: restApiId })
    if (response.items) {
      for (let resource of response.items) {
        if (path === resource.path) {
          return resource.id
        }
      }
    }
  }

  async findRestApiIdByName(name) {
    const response = await this.provider.request('APIGateway', 'getRestApis', { limit: 500 })
    if (response.items) {
      for (let restApi of response.items) {
        if (name === restApi.name) {
          return restApi.id
        }
      }
    }
  }

  async importApiGateway() {
    if (!this.config || !this.config.name) return

    if (!this.config.path) {
      this.config.path = '/'
    }

    if (!this.serverless.service.provider.apiGateway) {
      this.serverless.service.provider.apiGateway = {}
    }

    try {
      const restApiId = await this.findRestApiIdByName(this.config.name)
      if (!restApiId) {
        this.serverless.cli.log(`Unable to find REST API named '${this.config.name}'`)
        return
      }

      const rootResourceId = await this.findRestApiResource(restApiId, this.config.path)
      if (!rootResourceId) {
        this.serverless.cli.log(`Unable to find root resource ID (${this.config.path}) for REST API (${restApiId})`)
        return
      }

      this.serverless.service.provider.apiGateway.restApiId = restApiId
      this.serverless.service.provider.apiGateway.restApiRootResourceId = rootResourceId
      this.serverless.cli.log(`Imported API Gateway (${JSON.stringify(this.serverless.service.provider.apiGateway)})`)
    } catch (e) {
      console.error(chalk.red('\n Serverless Plugin Error --------------------------------------\n'))
      console.error(chalk.red('  ' + e.message))
    }
  }
}

module.exports = ImportApiGatewayPlugin
