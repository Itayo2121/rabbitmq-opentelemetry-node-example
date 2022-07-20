require('@aspecto/opentelemetry')({
  aspectoAuth: process.env.ASPECTO_API_KEY
});

const amqplib = require('amqplib');
const express = require('express')
const app = express()
const port = 3000

const sendRabbitMqMessage = async (message) => {
  const queue = 'tasks';
  const conn = await amqplib.connect('amqp://localhost');

  const channel = await conn.createChannel();
  await channel.assertQueue(queue);
  await channel.sendToQueue(queue, Buffer.from(message));
}

const rabbitMqWaitForMessages = async (callback) => {
  const queue = 'tasks';
  const conn = await amqplib.connect('amqp://localhost');

  const channel = await conn.createChannel();
  await channel.assertQueue(queue);
  await channel.consume(queue, message => {
    channel.ack(message)
    callback(message.content.toString())
  });
}

rabbitMqWaitForMessages(console.log)

app.get('/', (req, res) => {
  sendRabbitMqMessage(`Sending to rabbitMq - recived request to path: ${req.path}, at ${Date.now()}`);
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
