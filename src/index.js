const { EventEmitter } = require('events')
const HDKey = require('hdkey')
const ethUtil = require('ethereumjs-util')

const CONSTANT = {
    IFRAME_URL: 'https://mac:3000/',
    HD_PATH: `m/44'/60'/0'`,
    TYPE: 'wallet s1',
}

class WalletIOKeyring extends EventEmitter {
    constructor(opts = {}) {
        super()
        this.type = CONSTANT.TYPE
        this.page = 0
        this.perPage = 5
        this.unlockedAccount = 0
        this.hdk = new HDKey()
        this.network = 'mainnet'
        this.deserialize(opts)
    }

    async setupIframe() {
        this.iframe = document.createElement('iframe')
        this.iframe.src = CONSTANT.IFRAME_URL
        
        this.iframe.onload = () => {
            this.addAccounts();
        }
        document.body.appendChild(this.iframe)
    }

    deserialize(opts = {}) {
        this.hdPath = opts.hdPath || CONSTANT.HD_PATH
        this.iframeUrl = opts.iframeUrl || CONSTANT.IFRAME_URL
        this.accounts = opts.accounts || []
        this.accountIndexes = opts.accountIndexes || {}
        this.accounts = this.accounts.filter((account) => Object.keys(this.accountIndexes).includes(ethUtil.toChecksumAddress(account)))
        return Promise.resolve()
    }

    async addAccounts(num = 1) {
        console.log('this.iframe:', this.iframe);

        for (let index = 0; index < num; index++) {
            let opt = {
                method: 'getAccount111',
                params: this.hdPath,
            }

            this.iframe.contentWindow.postMessage(opt, '*')
        }
    }

}

function receiveMessage(event) {
    console.log('from iframe:', event);
    if (event.origin !== CONSTANT.IFRAME_URL) {
        return false
    }
}

async function main() {
    let ins = new WalletIOKeyring();
    await ins.setupIframe();
    // const acc = await ins.addAccounts();
    // console.log('acc:', acc);
}

window.onload = function () {
    window.addEventListener('message', receiveMessage)
    main();
}