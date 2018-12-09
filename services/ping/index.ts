// TODO: Add a README
import * as Amqp from 'amqp-ts';
import * as ping from 'ping';
import * as dotenv from 'dotenv'

// Load Environment Variables
dotenv.config()

// Initialize Rabbit Connection
const conn: Amqp.Connection = new Amqp.Connection(`amqp://${process.env.RABBIT_URL}`);
const exchange: Amqp.Exchange = conn.declareExchange('janus-tasks');
const queue: Amqp.Queue = conn.declareQueue('action.ping', { durable: false });

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
