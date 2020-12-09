# base

An implementation of MetaMask's [Keyring interface](https://github.com/MetaMask/eth-simple-keyring#the-keyring-class-protocol), that uses a [WalletS1](https://pro.wallet.io/hardware) hardware wallet for all cryptographic operations.

There are a number of differences:
- Because the keys are stored in the device, operations that rely on the device
  will fail if there is no WalletS1 device attached

- It does not support the `decryptMessage`, `exportAccount` methods, because own devices do not support these operations.

- Because extensions have limited access to browser features, there's no easy way to interact wth the  Hardware wallet from the MetaMask extension. This library implements a workaround to those restrictions by injecting (on demand) an iframe to the background page of the extension, (which is hosted [here](#TODO)).

The iframe is allowed to interact with the WalletS1 device (since U2F requires SSL and the iframe is hosted under https) using the libraries from [browser-wallet]() and establishes a two-way communication channel with the extension via postMessage.

# usage
1. `npm i @wangkaixuan/wallets1-keyring` or `yarn add @wangkaixuan/wallets1-keyring`
1. example, see [wallets1-keyring-demo](https://github.com/iroan/wallets1-keyring-demo) for detail.
    ```js
    const WalletIOKeyring = require('@wangkaixuan/wallets1-keyring');
    let ins = new WalletIOKeyring();
    console.log('addAccounts:', await ins.addAccounts(2));
    console.log('getAccounts:', await ins.getAccounts());
    console.log('serialize:', await ins.serialize());
    ...
    ```
    