// const crypto = require('crypto');
const bip39 = require('bip39');
// const HDKey = require('hdkey');
// const c32 = require('c32check');

// // Función para generar un private key a partir de una seed phrase
// async function generateStacksKeysFromSeedPhrase(seedPhrase, network = 'mainnet') {
//   try {
//     // Validar la seed phrase
//     if (!bip39.validateMnemonic(seedPhrase)) {
//       throw new Error('Invalid seed phrase');
//     }
    
//     // Convertir la seed phrase a seed (bytes)
//     const seed = await bip39.mnemonicToSeed(seedPhrase);
    
//     // Derivar la clave HD usando el path de Stacks
//     const hdkey = HDKey.fromMasterSeed(seed);
//     const child = hdkey.derive("m/44'/5757'/0'/0/0");
    
//     // Obtener private key y public key
//     const privateKey = child.privateKey.toString('hex');
//     const publicKey = child.publicKey.toString('hex');
    
//     // Determinar la versión basada en la red
//     const versionByte = network === 'testnet' ? 26 : 22; // 26 para testnet, 22 para mainnet
    
//     // Generar la dirección Stacks
//     const sha256 = crypto.createHash('sha256').update(Buffer.from(publicKey, 'hex')).digest();
//     const ripemd160 = crypto.createHash('ripemd160').update(sha256).digest('hex');
//     const stacksAddress = c32.c32address(versionByte, ripemd160);
    
//     return {
//       network,
//       seedPhrase,
//       privateKey,
//       publicKey,
//       stacksAddress
//     };
//   } catch (error) {
//     console.error('Error generating keys:', error);
//     throw error;
//   }
// }

// // Generar claves para mainnet y testnet con la misma seed phrase
// const seedPhrase = 'genuine when worry bike hedgehog nerve flash vanish orange thunder undo happy';

// // Generar para mainnet
// generateStacksKeysFromSeedPhrase(seedPhrase, 'mainnet')
//   .then(keys => {
//     console.log('=== MAINNET ===');
//     console.log('Seed Phrase:', keys.seedPhrase);
//     console.log('Private Key:', keys.privateKey);
//     console.log('Stacks Address:', keys.stacksAddress);
    
//     // Generar para testnet
//     return generateStacksKeysFromSeedPhrase(seedPhrase, 'testnet');
//   })
//   .then(keys => {
//     console.log('\n=== TESTNET ===');
//     console.log('Seed Phrase:', keys.seedPhrase);
//     console.log('Private Key:', keys.privateKey);
//     console.log('Stacks Address:', keys.stacksAddress);
//   })
//   .catch(error => {
//     console.error('Failed to generate keys:', error);
//   });



// Genera un mnemonic válido de 12 palabras (128 bits de entropía):
const mnemonic = bip39.generateMnemonic(128);
console.log(mnemonic); 
// -> Te dará 12 palabras con checksum correcto