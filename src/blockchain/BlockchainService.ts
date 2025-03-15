// import * as bip39 from 'bip39';
// import * as HDKey from 'hdkey';

// export class BlockchainService
// {
//     private async _derivePrivateKey(mnemonic: string): Promise<string> {
    
//         // if (!bip39.validateMnemonic(mnemonic)) {
//         //     throw new Error('Invalid seed phrase (mnemonic).');
//         // }

//         const seed = await bip39.mnemonicToSeed(mnemonic);

//         const root = HDKey.fromMasterSeed(seed);

//         const child = root.derive("m/44'/5757'/0'/0/0");

//         return child.privateKey.toString('hex');
//     }
// }