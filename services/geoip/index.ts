// TODO: Add a README
import * as dns from 'dns';
import * as Amqp from 'amqp-ts';
import * as request from 'request';
import * as dotenv from 'dotenv';

// Load Environment Variables
dotenv.config();

// Initialize Rabbit Connection
const conn: Amqp.Connection = new Amqp.Connection(`amqp://${process.env.RABBIT_URL}`);
const exchange: Amqp.Exchange = conn.declareExchange('janus-tasks');
const queue: Amqp.Queue = conn.declareQueue('action.geoip', { durable: false });

queue.bind(exchange);

// TODO: Add error chcking for missing env vars
const IPDATA_URL: string = process.env.IPDATA_URL;
const IPDATA_API_KEY: string = process.env.IPDATA_API_KEY;

interface GeoIpResult {
  message: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  continent: string;
  latitude: number;
  longitude: number;
  asn: string;
  organization: string;
  postal: string;
  flag: string;
  emojiFlag: string;
  languages: [{
    name: string;
    native: string;
  }];
  currency: {
    name: string;
    code: string;
    symbol: string;
    native: string;
  };
  timezone: {
    name: string;
    abbr: string;
    offset: string;
    isDst: boolean;
    currentTime: string;
  };
  threat: {
    isTor: boolean;
    isProxy: boolean;
    isAnonymous: boolean;
    isKnownAttacker: boolean;
    isKnownAbuser: boolean;
    isThreat: boolean;
    isBogon: boolean;
  };
}

interface GeoIpError {
  error: boolean;
  message: string;
}

queue.activateConsumer((message: Amqp.Message): Promise<GeoIpResult|GeoIpError> => {
  const host = message.getContent().host;
  message.ack();

  return new Promise((resolve, reject) => {
    // sometimes we a hostname, convert to IP
    getIpAddress(host).then(ip => {
      const url: string = `${IPDATA_URL}/${ip}?api-key=${IPDATA_API_KEY}`;

      request.get(url, (error, response, body) => {
        const json = JSON.parse(body);

        if (json.message) {
          const result: GeoIpError = {
            error: true,
            message: json.message
          };
          resolve(result);
        } else {
          const result: GeoIpResult = {
            error: false,
            message: null,
            ip: json.ip,
            city: json.city,
            region: json.region,
            country: json.country_name,
            continent: json.country_code,
            latitude: json.latitude,
            longitude: json.longitude,
            asn: json.asn,
            organization: json.organisation,
            postal: json.postal,
            flag: json.flag,
            emojiFlag: json.emoji_flag,
            languages: json.languages,
            currency: {
              name: json.currency.name,
              code: json.currency.code,
              symbol: json.currency.symbol,
              native: json.currency.native
            },
            timezone: {
              name: json.time_zone.name,
              abbr: json.time_zone.abbr,
              offset: json.time_zone.offset,
              isDst: json.time_zone.is_dst,
              currentTime: json.time_zone.current_time
            },
            threat: {
              isTor: json.threat.is_tor,
              isProxy: json.threat.is_proxy,
              isAnonymous: json.threat.is_anonymous,
              isKnownAttacker: json.threat.is_known_attacker,
              isKnownAbuser: json.threat.is_known_abuser,
              isThreat: json.threat.is_threat,
              isBogon: json.threat.is_bogon
            }
          };
          resolve(result);
        }
      });
    });
  });
});

function validateIp(address: string): boolean {
  // Borrowed from https://www.regextester.com/104038
  // tslint:disable-next-line
  const pattern: string = '((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))';
  const regex: RegExp = new RegExp(pattern);
  return regex.test(address);
}

function getIpAddress(address: string): Promise<string> {
  return new Promise(resolve => {
    if (validateIp(address)) {
      resolve(address);
    } else {
      dns.lookup(address, (err, addr) => {
        if (!err)
          resolve(addr);
      });
    }
  });
}
