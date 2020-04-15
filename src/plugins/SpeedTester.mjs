import SpeedTest from 'speedtest-net';

export default class SpeedTester {

    constructor(callback, interval = 300000) {
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
        console.log('Speed Job');
        return SpeedTest({ acceptLicense: true }).then(this.format).then(this.callback);
    }

    format(response) {
        return {
            ping: response.ping,
            download: response.download,
            upload: response.upload,
            isp: response.isp,
            external_ip: response.interface.externalIp,
            server_name: response.server.name,
            server_host: response.server.host,
            result_url: response.result.url
        };
    }
}