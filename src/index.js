const ethUtil = require('ethereumjs-util')
const Web3 = require('web3');
const secp256k1 = require('secp256k1');
const Transaction = require('ethereumjs-tx').Transaction
const CONSTANT = {
    IFRAME_URL: 'https://mac:3000',
    BASE_HD_PATH: `m/44'/60'/0`,
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
        document.head.appendChild(this.iframe)
    }

    async _addAccount(opt) {
        return new Promise((resolve, reject) => {
            this._sendToIframe(opt, ({ status, payload }) => {
                if (status === 'ok') {
                    const uncompressedPubKey = secp256k1.publicKeyConvert(payload, false).toString('hex');
                    const tmp = '0x' + uncompressedPubKey.slice(2);
                    const publicHash = web3.utils.keccak256(tmp);
                    const lowerAddr = '0x' + publicHash.slice(-40);
                    resolve(ethUtil.toChecksumAddress(lowerAddr))
                }
                else reject(status);
            });
        });
    }

    _sendToIframe(opt, cb) {
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

let ins = new WalletIOKeyring();
ins.iframe.onload = async () => {

    const txData = {
        nonce: '0x00',
        gasPrice: '0x09184e72a000',
        gasLimit: '0x2710',
        to: '0x0000000000000000000000000000000000000000',
        value: '0x00',
        data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
        v: '0x1c',
        r: '0x0',
        s: '0x0',
    };
    const addr = '0x04d9e7a5058632D31215a3d151796AA5EbB8e898';

    console.log('addAccounts:', await ins.addAccounts(2));
    console.log('removeAccount:', await ins.removeAccount(addr));
    console.log('addAccounts:', await ins.addAccounts(3));
    console.log('getAccounts:', await ins.getAccounts());
    console.log('serialize:', await ins.serialize());
    console.log('signTransaction:', await ins.signTransaction(addr, new Transaction(txData)));
    const hash = web3.utils.keccak256(Buffer.from('hello wkx'));
    console.log('signMessage:', await ins.signMessage(addr, hash));
    console.log('ins.accounts:', ins.accounts);
    console.log('getEncryptionPublicKey:', await ins.getEncryptionPublicKey(addr));
}    

WalletIOKeyring.type = CONSTANT.TYPE;
module.exports = WalletIOKeyring;
