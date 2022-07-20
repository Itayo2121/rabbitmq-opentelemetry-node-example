require('@aspecto/opentelemetry')({
  aspectoAuth: process.env.ASPECTO_API_KEY
 });

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// connect to rabbitmq server
const amqplib = require('amqplib');

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

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(async (req, res, next) => {
  sendRabbitMqMessage(`Sending to rabbitMq - recived request to ${req.path} at ${Date.now()}`);
  return next()
})
app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;


// docker run --rm -p5775:5775/udp -p6831:6831/udp -p6832:6832/udp -p5778:5778/tcp jaegertracing/jaeger-agent:1.30 --reporter.grpc.host-port=collector.aspecto.io:14250 --reporter.grpc.tls.enabled=true --agent.tags=aspecto.token=a311563e-8ece-467c-97dc-6276ef3a7b14
