import _ from 'lodash';
import redis from 'redis';
import moment from 'moment';
import dotenv from 'dotenv';

import Pinger from './plugins/Pinger.mjs';
import SpeedTester from './plugins/SpeedTester.mjs';

dotenv.config();

class App {

    constructor() {
        this.redis_client = redis.createClient(
            process.env.REDIS_PORT || 6379,
            process.env.REDIS_HOST || '127.0.0.1'
        );
        this.pinger = new Pinger(this.hosts, this.ping_callback.bind(this));
        this.speedtest = new SpeedTester(this.speed_callback.bind(this));
    }

    get hosts() {
        return _.filter(_.map(_.split(process.env.PING_HOSTNAMES, ','), (value) => {
            return _.trim(value);
        }), _.identity);
    }

    init() {
        this.redis_client.on('error', console.error);
        this.pinger.start();
        this.speedtest.start();
    }

    ping_callback(response) {
        this.redis_client.set('ping', JSON.stringify(response));
        console.log(moment().toISOString(), JSON.stringify(response));
    }

    speed_callback(response) {
        this.redis_client.set('speed', JSON.stringify(response));
        console.log(moment().toISOString(), JSON.stringify(response));
    }
};

const AppMonitor = new App();
AppMonitor.init();