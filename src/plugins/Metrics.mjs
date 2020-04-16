import _ from 'lodash';
import redis from 'redis';
import express from 'express';
import prom from 'prom-client';

export default class Metrics {

    constructor(hosts = [], port = 3000) {
        this.app = express();
        this.port = port;

        this.redis_client = this.create_listener();
        this.redis_read_client = this.create_reader();

        this.speed_ping_jitter_gauge = new prom.Gauge({ name: 'speed_ping_jitter', help: 'bandwidth ping jitter gauge', });
        this.speed_ping_latency_gauge = new prom.Gauge({ name: 'speed_ping_latency', help: 'bandwidth ping latency gauge', });
        this.speed_download_bandwidth_gauge = new prom.Gauge({ name: 'speed_download_bandwidth', help: 'bandwidth download bandwidth gauge', });
        this.speed_upload_bandwidth_gauge = new prom.Gauge({ name: 'speed_upload_bandwidth', help: 'bandwidth upload bandwidth gauge', });
        this.speed_detail_gauge = new prom.Gauge({ name: 'speed_detail', help: 'bandwidth Detail', 'labelNames': ['isp', 'external_ip', 'server_host', 'timestamp'] });

        this.hosts = _.map(hosts, (value) => {
            const name = _.replace(_.replace(_.toString(value), /\./g, '_'), /\-/, '_');
            const time_gauge = new prom.Gauge({ name: `ping_${name}`, help: `ping_${name} gauge` });
            const loss_gauge = new prom.Gauge({ name: `loss_${name}`, help: `loss_${name} gauge` });
            const alive_gauge = new prom.Gauge({ name: `alive_${name}`, help: `loss_${name} gauge` });

            return { 
                host: value, 
                time_gauge: time_gauge,
                loss_gauge: loss_gauge,
                alive_gauge: alive_gauge
            };
        });

        this.init();
    }

    create_listener() {
        const client = redis.createClient(
            process.env.REDIS_PORT || 6379,
            process.env.REDIS_HOST || '127.0.0.1'
        );
        client.config('set', 'notify-keyspace-events', 'KEA');
        client.subscribe('__keyevent@0__:set', 'ping');
        client.subscribe('__keyevent@0__:set', 'speed');

        return client;
    }

    create_reader() {
        return redis.createClient(
            process.env.REDIS_PORT || 6379,
            process.env.REDIS_HOST || '127.0.0.1'
        );
    }

    init() {
        this.redis_client.on('message', this.on_message.bind(this));

        return this.app.get('/metrics', (req, res) => {
            res.set('Content-Type', prom.register.contentType);
            res.end(prom.register.metrics());
        });
    }

    start() {
        this.app.listen(this.port, () => console.log(`app listening at port ${this.port}`));
    }

    on_message(channel, key) {
        switch (key) {
            case 'ping':
                this.update_ping();
                break;
            case 'speed':
                this.update_speed();
                break;
        }
    }

    update_ping() {
        return this.ping.then((value) => {
            _.each(value, (result) => {
                const host = _.find(this.hosts, (name) => {
                    return name.host === result.host;
                });

                if (!_.isUndefined(host)) {
                    host.time_gauge.set(Number(result.time) || 0);
                    host.loss_gauge.set(Number(result.loss) || 0);
                    host.alive_gauge.set(Number(result.alive) || 0);
                }
            });
        });
    }

    update_speed() {
        return this.speed.then((value) => {
            this.speed_ping_jitter_gauge.set(value.ping.jitter);
            this.speed_ping_latency_gauge.set(value.ping.latency);
            this.speed_download_bandwidth_gauge.set(value.download.bandwidth);
            this.speed_upload_bandwidth_gauge.set(value.upload.bandwidth);

            this.speed_detail_gauge.set({
                isp: value.isp,
                external_ip: value.external_ip, 
                server_host: value.server_host,
                timestamp: value.timestamp
            }, 1);

            return value;
        });
    }

    get ping() {
        return new Promise((resolve, reject) => {
            return this.redis_read_client.get('ping', (error, result) => {
                if (error) {
                    return reject(error);
                }

                return resolve(JSON.parse(result));
            });
        });
    }

    get speed() {
        return new Promise((resolve, reject) => {
            return this.redis_read_client.get('speed', (error, result) => {
                if (error) {
                    return reject(error);
                }

                return resolve(JSON.parse(result));
            });
        });
    }
}