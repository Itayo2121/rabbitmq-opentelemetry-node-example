// require('@aspecto/opentelemetry')({
//   aspectoAuth: process.env.ASPECTO_API_KEY
// });

const amqplib = require('amqplib');
const express = require('express')
const app = express()
const port = process.env.PORT || 3001

let rabbitConnection;
let exchange = 'logs'

const rabbitMqListenToMessages = async (callback) => {
    if (!rabbitConnection) {
        rabbitConnection = await amqplib.connect('amqp://localhost');
    }
    const channel = await rabbitConnection.createChannel();
    await channel.assertExchange(exchange, 'fanout')
    const q = await channel.assertQueue('');
    await channel.bindQueue(q.queue, exchange, '');
    await channel.consume('', (message) => callback(message.content.toString()))
}

app.listen(port, () => {
    rabbitMqListenToMessages((message) => console.log(`Consumer recieved message: ${message}`))
    console.log(`Consumer listening on port ${port}`)
})