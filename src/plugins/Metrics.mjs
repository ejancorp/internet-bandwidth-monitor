import redis from 'redis';
import express from 'express';
import prom from 'prom-client';

export default class Metrics {

    constructor(port = 3000) {
        this.app = express();
        this.port = port;

        this.redis_client = this.create_listener();
        this.redis_read_client = this.create_reader();

        this.speed_ping_jitter_gauge = new prom.Gauge({ name: 'speed_ping_jitter_gauge', help: 'Bandwith ping jitter gauge', });
        this.speed_ping_latency_gauge = new prom.Gauge({ name: 'speed_ping_latency_gauge', help: 'Bandwith ping latency gauge', });

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
        switch(key) {
            case 'ping':
                this.update_ping();
                break;
            case 'speed':
                this.update_speed();
                break;
        }
    }

    update_ping() {
        
    }

    update_speed() {
        return this.speed.then((value) => {
            
            this.speed_ping_jitter_gauge.set(value.ping.jitter);
            this.speed_ping_latency_gauge.set(value.ping.latency);

            return value;
        });
    }

    get ping() {
        const value = this.redis_read_client.get('ping');
        return JSON.parse(value);
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