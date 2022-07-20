// require('@aspecto/opentelemetry')({
//   aspectoAuth: process.env.ASPECTO_API_KEY
// });

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
