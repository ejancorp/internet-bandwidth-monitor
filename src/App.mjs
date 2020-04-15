import _ from 'lodash';
import dotenv from 'dotenv';

import Pinger from './plugins/Pinger.mjs';
import SpeedTester from './plugins/SpeedTester.mjs';

dotenv.config();

class App {

    constructor() {
        this.pinger = new Pinger(this.hosts, this.ping_callback);
        this.speedtest = new SpeedTester(this.speed_callback);
    }

    get hosts() {
        return _.filter(_.map(_.split(process.env.PING_HOSTNAMES, ','), (value) => {
            return _.trim(value);
        }), _.identity);
    }

    init() {
        this.pinger.start();
        this.speedtest.start();
    }

    ping_callback(response) {
        console.log('ping', response);
    }

    speed_callback(response) {
        console.log('speed', response);
    }
};

const AppMonitor = new App();
AppMonitor.init();