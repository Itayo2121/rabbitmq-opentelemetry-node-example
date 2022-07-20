# RabbitMq OpenTelemetry node example

This repo contains an example of how to collect ditributed tracing for rabbitmq in nodejs

## Tutorial
Table of Contents:
1. [ create application. ](#step1)
2. [ Add RabbitMq messaging code. ](#step2)
3. [ Add Opentelemetry tracing ](#step3)
4. [ Visualize tracing ](#step4)
5. [ Final notes ](#step5)

### Step 1 - create application <a name="step1"></a>


First lets create a basic node application


```javascript
/* app.js */

const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
```
This is taken directly from express hello world [`example`](https://expressjs.com/en/starter/hello-world.html).

### Step 2 - Add RabbitMq messaging code <a name="step2"></a>

Now lets add the code we need to publish and consume messages on RabbitMq. for that we will need to install the amqplib library and run a local instance of RabbitMq.
```bash
npm i amqplib

docker run -d --name rabbit rabbitmq:3-management
```

Now lets add the code to app.js

```javascript
/* app.js */

const amqplib = require('amqplib');
const express = require('express')
const app = express()
const port = 3000

let rabbitMqSetting = {
  queue: 'tasks'
};

const sendRabbitMqMessage = async (message) => {
  if (!rabbitMqSetting.connection) {
    rabbitMqSetting.connection = await amqplib.connect('amqp://localhost');
  }
  const channel = await rabbitMqSetting.connection.createChannel();
  await channel.assertQueue(rabbitMqSetting.queue);
  await channel.sendToQueue(rabbitMqSetting.queue, Buffer.from(message));
}

const rabbitMqListenForMessages = async (callback) => {
  if (!rabbitMqSetting.connection) {
    rabbitMqSetting.connection = await amqplib.connect('amqp://localhost');
  }
  const channel = await rabbitMqSetting.connection.createChannel();
  await channel.assertQueue(rabbitMqSetting.queue);
  await channel.consume(rabbitMqSetting.queue, message => {
    channel.ack(message)
    callback(message.content.toString())
  });
}

rabbitMqListenForMessages((message) => console.log(`Recieved message: '${message}'`))

app.get('/', (req, res) => {
  const message = 'Hello World!'
  console.log(`Send message: '${message}'`);
  sendRabbitMqMessage(message);
  res.send(message)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
```

Lets check our messaging works properly.
Run the application:
```bash
# terminal 1
node ./app.js
```
Call the get endpoint:
```bash
# terminal 2
curl http://localhost:3000
```

Now we should see the following printed on terminal 1:
```bash
Send message: 'Hello World!'
Recieved message: 'Hello World!'
```

### Step 3 - Add Opentelemetry tracing <a name="step3"></a>

So far so good. We can now start examinig our application behavior. For that we will collect our tracing using amqplib instrumentation. Then we will view this tracing using ConsoleSpanExporter, this means the traces will be printed to console.

Install the following packages:
```bash 
npm install @opentelemetry/sdk-node @opentelemetry/instrumentation-amqplib
```

Create a tracing.js file:
```javascript
/* tracing.js */

// Require dependencies
const opentelemetry = require("@opentelemetry/sdk-node");
const { AmqplibInstrumentation } = require('@opentelemetry/instrumentation-amqplib');

const sdk = new opentelemetry.NodeSDK({
  traceExporter: new opentelemetry.tracing.ConsoleSpanExporter(),
  instrumentations: [new AmqplibInstrumentation()]
});

sdk.start()
```

by running the application again and invoking the endpoint we can see the traces printed on console:
```bash
# terminal 1
node --require './tracing.js' ./app.js

# terminal 2
curl http://localhost:3000

# terminal 1
{
  traceId: 'b87282786c9aa5951d800f92155980c8',
  parentId: undefined,
  name: '<default> -> tasks send',
  id: '9a0182aa1e3e8617',
  kind: 3,
  timestamp: 1658299583483713,
  duration: 1086,
  attributes: {
    'messaging.protocol_version': '0.9.1',
    'messaging.url': 'amqp://localhost',
    'messaging.protocol': 'AMQP',
    'net.peer.name': 'localhost',
    'net.peer.port': 5672,
    'messaging.system': 'rabbitmq',
    'messaging.destination': '',
    'messaging.destination_kind': 'topic',
    'messaging.rabbitmq.routing_key': 'tasks'
  },
  status: { code: 0 },
  events: [],
  links: []
}
{
  traceId: 'b87282786c9aa5951d800f92155980c8',
  parentId: '9a0182aa1e3e8617',
  name: 'tasks process',
  id: 'cf82278ed4e5f61c',
  kind: 4,
  timestamp: 1658299583487785,
  duration: 650,
  attributes: {
    'messaging.protocol_version': '0.9.1',
    'messaging.url': 'amqp://localhost',
    'messaging.protocol': 'AMQP',
    'net.peer.name': 'localhost',
    'net.peer.port': 5672,
    'messaging.system': 'rabbitmq',
    'messaging.destination': '',
    'messaging.destination_kind': 'topic',
    'messaging.rabbitmq.routing_key': 'tasks',
    'messaging.operation': 'process'
  },
  status: { code: 0 },
  events: [],
  links: []
}
```

### Step 4 - Visualize tracing <a name="step4"></a>

Well done! All we have left is to export these traces to a distributed platform so we can view and analyze the behaviour of the application.
To do that will will use Aspecto platform.
Lets edit our tracing.js file and add Aspecto exporter. note that for that you will need to get an Aspecto api key. You can get it by creating a [`free acount`](https://www.aspecto.io/pricing/)

Install the following packages:
```bash
npm install @opentelemetry/sdk-trace-base @opentelemetry/exporter-collector
```

Edit tracing.js and add the new exporter.
```javascript
/* tracing.js */

// Require dependencies
const opentelemetry = require("@opentelemetry/sdk-node");
const { AmqplibInstrumentation } = require('@opentelemetry/instrumentation-amqplib');

const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { CollectorTraceExporter } = require('@opentelemetry/exporter-collector');

const aspectoExporter = new CollectorTraceExporter({
  url: 'https://otelcol.aspecto.io/v1/trace',
  headers: {
    // Aspecto API-Key is required
    Authorization: process.env.ASPECTO_API_KEY
  }
})

const sdk = new opentelemetry.NodeSDK({
  spanProcessor: new SimpleSpanProcessor(aspectoExporter),
  instrumentations: [new AmqplibInstrumentation()]
});

sdk.start()
```

Thats it!. Now by running the application and invoking the endpoint once again we can view our tracing in the Aspecto platform. Just login to your account and view the recent traces. Aspecto visualize the tracing as a graph which makes it super convient to understand the application's flow.

### Final notes: <a name="step5"></a>

Aspecto provides a simple way for wrapping all the instrumentations your node application needs with the Aspecto SDK. Simply import and invoke the following package at the beginig of you code (before all other imports)
```javascript
require('@aspecto/opentelemetry')({
  aspectoAuth: process.env.ASPECTO_API_KEY
});
```

## License
[MIT](https://choosealicense.com/licenses/mit/)