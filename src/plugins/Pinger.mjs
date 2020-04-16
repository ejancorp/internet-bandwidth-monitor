import _ from 'lodash';
import Promise from 'bluebird';
import ping from 'ping';
import moment from 'moment';

export default class Pinger {

    constructor(hosts, callback, interval = 5000) {
        this.hosts = hosts;
        this.callback = callback;
        this.interval = interval;
    }

    start() {
        return this.job().then(this.recur.bind(this));
    }

    recur() {
        return setTimeout(() => {
            return this.job().then(this.recur.bind(this));
        }, this.interval);
    }

    job() {
        return Promise.map(this.hosts, this.process).then(this.format).then(this.callback);
    }

    process(host) {
        return ping.promise.probe(host).then((value) => {
            return _.extend(value, { host: host });
        });
    }

    format(response) {
        return _.map(response, (result) => {
            return {
                alive: result.alive,
                time: result.time,
                loss: result.packetLoss,
                host: result.host,
                timestamp: moment().unix()
            };
        });
    }
};