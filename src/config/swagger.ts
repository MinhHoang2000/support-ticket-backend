import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tickets API',
      version: '1.0.0',
      description: 'API documentation for Tickets application with versioning support (v1, v2)',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api/v1`,
        description: 'Development server - API v1',
      },
      {
        url: `http://localhost:${process.env.PORT || 3000}/api/v2`,
        description: 'Development server - API v2',
      },
    ],
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the request was successful',
              example: true,
            },
            data: {
              description: 'Response data',
            },
            message: {
              type: 'string',
              description: 'Response message',
              example: 'Success',
            },
            error: {
              type: 'string',
              nullable: true,
              description: 'Error message if any',
              example: null,
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp',
              example: '2026-01-28T10:30:00.000Z',
            },
          },
          required: ['success', 'timestamp'],
        },
        HealthCheckData: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok',
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
              example: 1234.56,
            },
            environment: {
              type: 'string',
              example: 'development',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            data: {
              type: 'object',
              nullable: true,
            },
            message: {
              type: 'string',
              example: 'An error occurred',
            },
            error: {
              type: 'string',
              example: 'Error details',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-28T10:30:00.000Z',
            },
          },
          required: ['success', 'message', 'timestamp'],
        },
      },
      responses: {
        Success: {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiResponse',
              },
            },
          },
        },
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/**/*.ts'], // Path to the API files
};

export const swaggerSpec = swaggerJsdoc(options);
