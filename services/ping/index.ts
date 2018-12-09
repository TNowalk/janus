import * as Amqp from 'amqp-ts';

const ping = require('ping');
require('dotenv').config();

// Initialize Rabbit Connection
const conn = new Amqp.Connection(`amqp://${process.env.RABBIT_URL}`);
const exchange = conn.declareExchange('janus-tasks');
const queue = conn.declareQueue('action.ping', { durable: false });

queue.bind(exchange);

interface PingResult {
  alive: boolean;
  output: string;
  time: string;
  min: string;
  max: string;
  avg: string;
  host: string;
  ip: string;
}

queue.activateConsumer((message: Amqp.Message): Promise<PingResult> => {
  const host = message.getContent().host;
  const count = message.getContent().count || 1;
  message.ack();
  return ping.promise.probe(host, { timeout: count + 1, extra: ['-c ' + count] });
});
