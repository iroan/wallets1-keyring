const ethUtil = require('ethereumjs-util')
const Web3 = require('web3');
const secp256k1 = require('secp256k1');

const CONSTANT = {
    IFRAME_URL: 'https://mac:3000',
    BASE_HD_PATH: `m/44'/60'/0'`,
    TYPE: 'WalletS1',
}

const web3 = new Web3();

class WalletIOKeyring {
    constructor(opts = {}) {
        this.deserialize(opts)
        this._setupIframe()
    }

    _setupIframe() {
        this.iframe = document.createElement('iframe')
        this.iframe.src = CONSTANT.IFRAME_URL
        this.iframe.onload = () => {
            this.iframeLoaded = true;
        };
        document.head.appendChild(this.iframe)
    }

    _addAccount(opt) {
        return new Promise((resolve, reject) => {
            this._sendToIframe(opt, ({ status, payload }) => {
                if (status === 'ok') {
                    const uncompressedPubKey = secp256k1.publicKeyConvert(payload, false);
                    const str = Buffer.from(uncompressedPubKey).toString('hex');
                    const tmp = '0x' + str.slice(2);
                    const publicHash = web3.utils.keccak256(tmp);
                    const lowerAddr = '0x' + publicHash.slice(-40);
                    resolve(ethUtil.toChecksumAddress(lowerAddr));
                }
                else reject(status);
            });
        });
    }

    _sendToIframe(opt, cb) {
        if (this.iframeLoaded === false) {
            if (this.iframeLoadTimeOutCnt > 10) {
                this.iframeLoadTimeOutCnt = 0;
                return;
            }
            setTimeout(() => {
                this._sendToIframe(opt, cb);
                this.iframeLoadTimeOutCnt++;
            }, 1000);

            return;
        }

        this.iframe.contentWindow.postMessage(opt, '*')
        function onMessage(event) {
            window.removeEventListener('message', onMessage)

            if (event.origin !== CONSTANT.IFRAME_URL) return;

            let response = event.data;
            console.log('response from iframe :', response);
            if (response && response.action && response.action === `${opt.action}-reply`) {
                cb && cb(response)
            }
        }
        window.addEventListener('message', onMessage)
    }

    serialize() {
        return Promise.resolve({
            accounts: this.accounts,
            currentAccountIndex: this.currentAccountIndex,
        });
    }

    deserialize(opts = {}) {
        this.accounts = opts.accounts || {};
        this.currentAccountIndex = opts.currentAccountIndex || 0;
        this.iframeLoaded = false;
        this.iframeLoadTimeOutCnt = 0;
        return Promise.resolve()
    }

    async addAccounts(num = 1) {
        return new Promise(async (resolve) => {
            const from = this.currentAccountIndex;
            this.currentAccountIndex += num;
            let newAccounts = {};
            for (let index = from; index < this.currentAccountIndex; index++) {
                let opt = {
                    action: 'getPubKey',
                    payload: [CONSTANT.BASE_HD_PATH, index].join('/'),
                };

                try {
                    const currentAddr = await this._addAccount(opt)
                    newAccounts[currentAddr] = opt.payload;
                } catch (e) {
                    console.error(e);
                }
            }

            Object.assign(this.accounts, newAccounts);
            resolve(newAccounts);
        })
    }

    getAccounts() {
        return Promise.resolve(this.accounts);
    }

    signTransaction(address, tx) {
        return new Promise((resolve, reject) => {
            if (!this.accounts[address]) reject(new Error('invaild address'));

            let opt = {
                action: 'getTxSignature',
                payload: {
                    hdPath: this.accounts[address],
                    currType: 'ETH',
                    rawData: tx.serialize().toString('hex')
                },
            };

            this._sendToIframe(opt, ({ status, payload }) => {
                if (status === 'ok') {
                    tx.r = '0x' + payload.slice(2, 2 + 64);
                    tx.s = '0x' + payload.slice(2 + 64);
                    resolve(tx)
                }
                else reject(status);
            });
        });
    }

    signMessage(address, hash) {
        return new Promise((resolve, reject) => {
            if (!this.accounts[address]) reject(new Error('invaild address'));
            let opt = {
                action: 'getMsgSignature',
                payload: {
                    hdPath: this.accounts[address],
                    currType: 'ETH',
                    rawData: hash
                },
            };

            this._sendToIframe(opt, ({ status, payload }) => {
                if (status === 'ok') {
                    resolve(payload)
                }
                else reject(status);
            });
        });
    }

    async getEncryptionPublicKey(address) {
        return new Promise(async (resolve, reject) => {
            if (!this.accounts[address]) reject(new Error('invaild address'));
            let opt = {
                action: 'getPubKey',
                payload: this.accounts[address],
            };

            this._sendToIframe(opt, ({ status, payload }) => {
                if (status === 'ok') {
                    resolve(Buffer.from(payload).toString('hex'))
                }
                else {
                    reject(status);
                }
            });
        });
    }

    decryptMessage() {
        throw new Error('Not supported on this device')
    }

    exportAccount() {
        throw new Error('Not supported on this device')
    }

    removeAccount(address) {
        return new Promise(async (resolve, reject) => {
            if (!this.accounts[address]) reject(new Error('invaild address'));
            delete this.accounts[address];
            resolve(this.accounts);
        });
    }

}

WalletIOKeyring.type = CONSTANT.TYPE;
module.exports = WalletIOKeyring;
