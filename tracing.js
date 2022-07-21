/* tracing.js */

// Require dependencies
const opentelemetry = require("@opentelemetry/sdk-node");
const { AmqplibInstrumentation } = require('@opentelemetry/instrumentation-amqplib');
const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { CollectorTraceExporter } = require('@opentelemetry/exporter-collector');
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");

// const aspectoExporter = new CollectorTraceExporter({
//   url: 'https://otelcol.aspecto.io/v1/trace',
//   headers: {
//     // Aspecto API-Key is required
//     Authorization: process.env.ASPECTO_API_KEY
//   }
// })

// const sdk = new opentelemetry.NodeSDK({
//   spanProcessor: new SimpleSpanProcessor(aspectoExporter),
//   instrumentations: [new AmqplibInstrumentation()]
// });

const sdk = new opentelemetry.NodeSDK({
  traceExporter: new opentelemetry.tracing.ConsoleSpanExporter(),
  instrumentations: [new AmqplibInstrumentation()]
});

// sdk.addResource(new opentelemetry.resources.Resource({
//   [SemanticResourceAttributes.SERVICE_NAME]: 'Node-Application' // service name is required
// }),)

sdk.start()