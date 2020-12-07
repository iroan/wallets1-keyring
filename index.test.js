const WalletIOKeyring = require('./src');

async function main() {
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
};

main();
