const ImportApiGatewayPlugin = require('.')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = jest.genMockFromModule('serverless/lib/plugins/aws/provider/awsProvider')
const CLI = jest.genMockFromModule('serverless/lib/classes/CLI')

describe('ImportApiGatewayPlugin', () => {
  let plugin
  let serverless
  let options

  beforeEach(() => {
    serverless = new Serverless()
    serverless.service.service = 'my-service'
    options = {}
    serverless.setProvider('aws', new AwsProvider(serverless))
    serverless.cli = new CLI(serverless)
  })

  describe('constructor', () => {
    beforeEach(() => {
      serverless.service.provider.apiGateway = undefined
      plugin = new ImportApiGatewayPlugin(serverless, options)
    })

    it('should set service provider apiGateway if not specified', () => {
      expect(plugin.serverless.service.provider.apiGateway).toEqual({})
    })

    it('should set the provider to instance of AwsProvider', () => {
      expect(plugin.provider).toBeInstanceOf(AwsProvider)
    })

    it('should have access to the serverless instance', () => {
      expect(plugin.serverless).toEqual(serverless)
    })
  })

  describe('without configuration', () => {
    it('should default to empty config if missing object "custom"', () => {
      serverless.service.custom = undefined
      plugin = new ImportApiGatewayPlugin(serverless, options)

      expect(plugin.config).toEqual({})
    })

    it('should default to empty config if missing object "custom.importApiGateway"', () => {
      serverless.service.custom = {}
      plugin = new ImportApiGatewayPlugin(serverless, options)

      expect(plugin.config).toEqual({})
    })

    it('should default to empty config if null object "custom.importApiGateway"', () => {
      serverless.service.custom = {
        importApiGateway: null
      }
      plugin = new ImportApiGatewayPlugin(serverless, options)

      expect(plugin.config).toEqual({})
    })

    it('should default to root path if missing property "custom.importApiGateway.path"', () => {
      serverless.service.custom = {
        importApiGateway: {
          name: 'stage-service-name'
        }
      }
      plugin = new ImportApiGatewayPlugin(serverless, options)

      expect(plugin.config.path).toEqual('/')
    })

    it('should default to empty resources array if missing property "custom.importApiGateway.resources"', () => {
      serverless.service.custom = {
        importApiGateway: {
          name: 'stage-service-name'
        }
      }
      plugin = new ImportApiGatewayPlugin(serverless, options)

      expect(plugin.config.resources).toEqual([])
    })

    it('should not set hooks if missing property "custom.importApiGateway.name"', () => {
      serverless.service.custom = {
        importApiGateway: {}
      }
      plugin = new ImportApiGatewayPlugin(serverless, options)

      expect(plugin.hooks).not.toHaveProperty('before:package:setupProviderConfiguration')
    })

    it('should not set hooks if empty property "custom.importApiGateway.name"', () => {
      serverless.service.custom = {
        importApiGateway: {
          name: ''
        }
      }
      plugin = new ImportApiGatewayPlugin(serverless, options)

      expect(plugin.hooks).not.toHaveProperty('before:package:setupProviderConfiguration')
    })
  })

  describe('with configuration', () => {
    beforeEach(() => {
      serverless.service.custom = {
        importApiGateway: {
          name: 'stage-service-name'
        }
      }
      plugin = new ImportApiGatewayPlugin(serverless, options)
    })

    it('should set config', () => {
      expect(plugin.config).toBeTruthy()
    })

    it('should set hooks', () => {
      expect(plugin.hooks).toHaveProperty('before:package:setupProviderConfiguration')
    })
  })

  describe('importApiGateway()', () => {
    const mockRestApis = {
      items: [
        {
          name: 'not-it',
          id: 'some'
        },
        {
          name: 'stage-service',
          id: 'thing'
        }
      ]
    }

    const mockResources = {
      items: [
        {
          id: 'someId',
          path: '/some'
        },
        {
          id: 'rootId',
          path: '/'
        },
        {
          id: 'thingId',
          path: '/thing'
        },
      ]
    }

    beforeEach(() => {
      serverless.service.custom = {
        importApiGateway: {
          name: mockRestApis.items[1].name,
          path: '/',
          resources: [
            mockResources.items[0].path,
            mockResources.items[2].path
          ]
        }
      }

      plugin = new ImportApiGatewayPlugin(serverless, options)
    })

    it('should log info when unable to find REST API by name', async () => {
      plugin.provider.request.mockResolvedValueOnce({})

      await plugin.importApiGateway()

      expect(plugin.serverless.cli.log).toHaveBeenLastCalledWith(expect.stringContaining('Unable to find REST API named'))
    })

    it('should log info when unable to find REST API root resource path', async () => {
      plugin.provider.request
        .mockResolvedValueOnce(mockRestApis)
        .mockResolvedValueOnce({})

      await plugin.importApiGateway()

      expect(plugin.serverless.cli.log).toHaveBeenLastCalledWith(expect.stringContaining('Unable to find root resource path'))
    })

    it('should log info when unable to find REST API resource path', async () => {
      const mockMissingResources = {
        items: [
          mockResources.items[1],
          mockResources.items[2]
        ]
      }

      plugin.provider.request
        .mockResolvedValueOnce(mockRestApis)
        .mockResolvedValueOnce(mockMissingResources)

      await plugin.importApiGateway()

      expect(plugin.serverless.cli.log).toHaveBeenLastCalledWith(expect.stringContaining('Unable to find resource path'))
    })

    it('should log error when exception caught', async () => {
      const spy = jest.spyOn(console, 'error')
      const errorMessage = 'Some AWS provider error'
      plugin.provider.request
        .mockRejectedValueOnce(new Error(errorMessage))

      await plugin.importApiGateway()

      expect(spy).toHaveBeenLastCalledWith(expect.stringContaining(errorMessage))
    })

    it('should import existing API Gateway details and log success', async () => {
      const expectedRestApi = mockRestApis.items[1]
      const expectedRootResource = mockResources.items[1]
      const expectedResources = {
        '/some': 'someId',
        '/thing': 'thingId'
      }

      plugin.provider.request
        .mockResolvedValueOnce(mockRestApis)
        .mockResolvedValueOnce(mockResources)

      await plugin.importApiGateway()

      const apiGateway = plugin.serverless.service.provider.apiGateway
      expect(apiGateway.restApiId).toEqual(expectedRestApi.id)
      expect(apiGateway.restApiRootResourceId).toEqual(expectedRootResource.id)
      expect(apiGateway.restApiResources).toEqual(expectedResources)

      expect(plugin.serverless.cli.log).toHaveBeenLastCalledWith(expect.stringContaining('Imported API Gateway'))
    })
  })
})
