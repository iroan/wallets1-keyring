const { EventEmitter } = require('events')
const HDKey = require('hdkey')
const ethUtil = require('ethereumjs-util')
const Web3 = require('web3');
const secp256k1 = require('secp256k1');
const Transaction = require('ethereumjs-tx').Transaction
const CONSTANT = {
    IFRAME_URL: 'https://mac:3000',
    HD_PATH: `m/44'/60'/0`,
    TYPE: 'wallet s1',
}

const web3 = new Web3();

class WalletIOKeyring extends EventEmitter {
    constructor(opts = {}) {
        super()
        this.type = CONSTANT.TYPE
        this.page = 0
        this.perPage = 5
        this.currentAccountIndex = 0
        this.hdk = new HDKey()
        this.network = 'mainnet'
        this.deserialize(opts)
        this._setupIframe()
    }

    _setupIframe() {
        this.iframe = document.createElement('iframe')
        this.iframe.src = CONSTANT.IFRAME_URL
        document.head.appendChild(this.iframe)
    }

    async deserialize(opts = {}) {
        this.accounts = opts.accounts || {}
        return Promise.resolve()
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

    signMessage(address, hash) {
        let opt = {
            action: 'getMsgSignature',
            payload: {
                hdPath: CONSTANT.HD_PATH,
                currType: 'ETH',
                msgHash: hash
            },
        };

        return new Promise((resolve, reject) => {
            this._sendToIframe(opt, ({ status, payload }) => {
                if (status === 'ok') {
                    resolve(payload)
                }
                else reject(status);
            });
        });
    }

    signTransaction(address, tx) {
        let opt = {
            action: 'getTxSignature',
            payload: {
                hdPath: CONSTANT.HD_PATH,
                currType: 'ETH',
                txRaw: tx.serialize().toString('hex')
            },
        };

        return new Promise((resolve, reject) => {
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

    getAccounts() {
        return Promise.resolve(this.accounts);
    }

    async addAccounts(num = 1) {
        return new Promise(async (resolve) => {
            const from = this.currentAccountIndex;
            this.currentAccountIndex += num;
            let newAccounts = {};
            for (let index = from; index < this.currentAccountIndex; index++) {
                let opt = {
                    action: 'getPubKey',
                    payload: [CONSTANT.HD_PATH, index].join('/'),
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
}

let ins = new WalletIOKeyring();
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

ins.iframe.onload = async () => {
    console.log('addAccounts:', await ins.addAccounts(1));
    console.log('addAccounts:', await ins.addAccounts(3));
    console.log('getAccounts:', await ins.getAccounts());
    console.log('signTransaction:', await ins.signTransaction('address', new Transaction(txData)));
    // const hash = web3.utils.keccak256(Buffer.from('hello wkx'));
    // console.log('signMessage:', await ins.signMessage('address', hash));
    console.log('ins.accounts:', ins.accounts);
}    
