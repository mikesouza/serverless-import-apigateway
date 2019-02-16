# serverless-import-apigateway

Dynamically import an existing AWS API Gateway into your Serverless stack.

## Usage

Add plugin to your `serverless.yml`:

```yaml
plugins:
  - serverless-import-apigateway
```

Add custom configuration to your `serverless.yml`:

```yaml
custom:
  importApiGateway:
    name: ${self:provider.stage}-existing-service
    path: /
```

| Property | Required | Type     | Default | Description                                                |
|----------|----------|----------|---------|------------------------------------------------------------|
| `name`   |  `true`  | `string` |         | The name of the REST API for the AWS API Gateway to import |
| `path`   |  `false` | `string` |   `/`   | The root resource path to import from the REST API         |
