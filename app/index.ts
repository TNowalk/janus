// TODO: Lint this file
// TODO: Dockerize the app dir
// TODO: Clena this all up

import * as Amqp from "amqp-ts";
Amqp.log.transports.console.level = 'debug';

// Import Express
let express = require('express');

// Import GraphQL
let graphql = require('express-graphql');
let { buildSchema } = require('graphql');

// Initialize Rabbit Connection
let conn = new Amqp.Connection('amqp://localhost');
let exchange = conn.declareExchange('janus-tasks');
let queue = conn.declareQueue('action.ping', { durable: false });

queue.bind(exchange);

// Define Response Schema
// TODO: Look into if the schema can be built from multiple files.  If so,
//       move the PingResult and ping function to it's own module.
let schema = buildSchema(`
  type Query {
    message: String,
    ping(host: String!, count: Int = 1): PingResult
  },
  type PingResult {
    alive: Boolean,
    output: String,
    time: String,
    min: String,
    max: String,
    avg: String,
    host: String,
    ip: String
  }
`);

let ping = (args) => {
  if (args.count < 1) {
    args.count = 1;
  }
  // TODO: Need some sort of timeout / error if no response
  return queue.rpc({ host: args.host, count: args.count }).then((result) => {
    return JSON.parse(result.getContent());
  });
}

// Define actions
let root = {
  message: () => 'Hello World!',
  ping
};

let app = express();

// Inject GraphQL middleware
app.use('/api', graphql({
  schema,
  rootValue: root,
  graphiql: true
}));

// Start Server
app.listen(4000, () => console.log('Express GraphQL Server now running at http://localhost:4000/api'));
