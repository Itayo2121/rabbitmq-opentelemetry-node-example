// require('@aspecto/opentelemetry')({
//   aspectoAuth: process.env.ASPECTO_API_KEY
// });

const amqplib = require('amqplib');
const express = require('express')
const app = express()
const port = process.env.PORT || 3000

let rabbitConnection;
let exchange = 'logs'
const sendRabbitMqMessage = async (message) => {
  if (!rabbitConnection) {
    rabbitConnection = await amqplib.connect('amqp://localhost');
  }
  const channel = await rabbitConnection.createChannel();
  await channel.assertExchange(exchange , 'fanout')
  await channel.publish(exchange, '', Buffer.from(message))
}

app.get('/', (req, res) => {
  const message = 'Hello World!'
  console.log(`Send message: '${message}'`);
  sendRabbitMqMessage(message);
  res.send(message)
})

app.listen(port, () => {
  console.log(`Publisher listening on port ${port}`)
})
