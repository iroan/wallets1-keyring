const { EventEmitter } = require('events')
const HDKey = require('hdkey')
const ethUtil = require('ethereumjs-util')

const CONSTANT = {
    IFRAME_URL: 'https://mac:3000',
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
        this._setupIframe()
    }

    _setupIframe() {
        this.iframe = document.createElement('iframe')
        this.iframe.src = CONSTANT.IFRAME_URL
        document.head.appendChild(this.iframe)
    }

    deserialize(opts = {}) {
        this.hdPath = opts.hdPath || CONSTANT.HD_PATH
        this.iframeUrl = opts.iframeUrl || CONSTANT.IFRAME_URL
        this.accounts = opts.accounts || []
        this.accountIndexes = opts.accountIndexes || {}
        this.accounts = this.accounts.filter((account) => Object.keys(this.accountIndexes).includes(ethUtil.toChecksumAddress(account)))
        return Promise.resolve()
    }

    addAccounts(num = 1) {
        for (let index = 0; index < num; index++) {
            let opt = {
                method: 'getAccount',
                params: this.hdPath,
            }

            this.iframe.contentWindow.postMessage(opt, '*')
        }
    }
}

function onMessage(event) {
    if (event.origin !== CONSTANT.IFRAME_URL) {
        return false
    }
    console.log('from iframe:', event);
}

window.addEventListener('message', onMessage)

let ins = new WalletIOKeyring();
ins.iframe.onload = () => {
    ins.addAccounts();
}    
