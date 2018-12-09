// TODO: Lint this file
// TODO: Dockerize the app dir
// TODO: Clean this all up
// TODO: Add a README

// Imports
import * as Amqp from 'amqp-ts';
import * as express from 'express';
import * as graphql from 'express-graphql';
import { buildSchema } from 'graphql';

// TODO: Remove this logging
Amqp.log.transports.console.level = 'debug';

// Initialize Rabbit Connection
let conn: Amqp.Connection = new Amqp.Connection('amqp://localhost');
let exchange: Ampq.Exchange = conn.declareExchange('janus-tasks');
let queues = {
  ping: conn.declareQueue('action.ping', { durable: false }),
  geoip: conn.declareQueue('action.geoip', { durable: false })
};

for (let qKey in queues) {
  queues[qKey].bind(exchange);
}

// Define Response Schema
// TODO: Look into if the schema can be built from multiple files.  If so,
//       move the PingResult and ping function to it's own module.
//       https://stackoverflow.com/a/43741760
//       https://github.com/graphql-boilerplates/typescript-graphql-server/blob/master/basic/src/index.ts
let schema = buildSchema(`
  type Query {
    message: String,
    ping(host: String!, count: Int = 1): PingResult,
    geoip(host: String!): GeoIpResult
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
  },
  type GeoIpResult {
    error: Boolean,
    message: String,
    ip: String,
    city: String,
    region: String,
    country: String,
    continent: String,
    latitude: String,
    longitude: String,
    asn: String,
    organization: String,
    postal: String,
    flag: String,
    emojiFlag: String,
    languages: [GeoIpLanguage],
    currency: GeoIpCurrency,
    timezone: GeoIpTimezone,
    threat: GeoIpThreat
  },
  type GeoIpLanguage {
    name: String,
    native: String
  },
  type GeoIpCurrency {
    name: String,
    code: String,
    symbol: String,
    native: String,
  },
  type GeoIpTimezone {
    name: String,
    abbr: String,
    offset: String,
    isDst: Boolean,
    currentTime: String,
  },
  type GeoIpThreat {
    isTor: Boolean,
    isProxy: Boolean,
    isAnonymous: Boolean,
    isKnownAttacker: Boolean,
    isKnownAbuser: Boolean,
    isThreat: Boolean,
    isBogon: Boolean
  }
`);

let ping = ({ host, count }) => {
  if (count < 1) {
    count = 1;
  }
  // TODO: Need some sort of timeout / error if no response
  return queues.ping.rpc({ host, count }).then((result) => {
    return JSON.parse(result.getContent());
  });
}

let geoip = ({ host }) => {
  // TODO: Need some sort of timeout / error if no response
  return queues.geoip.rpc({ host }).then((result) => {
    return JSON.parse(result.getContent());
  });
}

// Define actions
let root = {
  message: () => 'Hello World!',
  ping,
  geoip
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
