const { EventEmitter } = require('events')
const HDKey = require('hdkey')
const ethUtil = require('ethereumjs-util')
const Web3 = require('web3');
const secp256k1 = require('secp256k1');

const CONSTANT = {
    IFRAME_URL: 'https://mac:3000',
    HD_PATH: `m/44'/60'/0'`,
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
        this.hdPath = opts.hdPath || CONSTANT.HD_PATH
        this.accounts = opts.accounts || []
        this.accountIndexes = opts.accountIndexes || {}
        this.accounts = this.accounts.filter((account) => Object.keys(this.accountIndexes).includes(ethUtil.toChecksumAddress(account)))
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

    async addAccounts(num = 1) {
        return new Promise(async (resolve) => {
            const from = this.currentAccountIndex;
            const to = this.currentAccountIndex + num;
            let newAccounts = [];
            for (let index = from; index < to; index++) {
                let opt = {
                    action: 'getPubKey',
                    payload: this.hdPath,
                }

                try {
                    const currentAddr = await this._addAccount(opt)
                    newAccounts.push(currentAddr);
                } catch (e) {
                    console.error(e);
                }
            }

            this.accounts = this.accounts.concat(newAccounts);
            resolve(newAccounts);
        })
    }

    _sendToIframe(opt, cb) {
        this.iframe.contentWindow.postMessage(opt, '*')
        function onMessage(event) {
            let response = event.data;
            console.log('response from iframe :', response);
            if (event.origin !== CONSTANT.IFRAME_URL) {
                return false
            }

            if (response && response.action && response.action === `${opt.action}-reply`) {
                cb && cb(response)
                return undefined
            }
            window.removeEventListener('message', onMessage)
            return undefined
        }
        window.addEventListener('message', onMessage)
    }
}


let ins = new WalletIOKeyring();
ins.iframe.onload = async () => {
    console.log('addAccounts:', await ins.addAccounts(3));
}    
