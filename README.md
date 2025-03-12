# Clarity AI Agent - VSCode Extension

## Description

Clarity AI Agent is a Visual Studio Code extension that revolutionizes the development, testing, and deployment of smart contracts written in Clarity for the Stacks blockchain. This tool provides a complete and intuitive graphical interface to manage the entire lifecycle of smart contract development, eliminating the need to constantly switch between the editor and command line.

## Features

### 🏗️ Contract Builder
- AI-powered contract generation based on your text description
- Automatically creates contract files in your project structure
- Updates the project's TOML file to register new contracts
- Supports creation of multiple contracts
- Interactive preview of generated contracts
- Allows you to request specific modifications to generated contracts

### 🧪 Automated Testing
- Automatic generation of unit tests
- Support for testing multiple components (wallet.clar, nft.clar, collection.clar, auth.clar)
- Immediate visualization of test results
- Automatic verification of functionalities such as Login, Register, Create Collection, and Create NFT

### 🚀 Simplified Deployment
- Interface to enter your private key wallet
- Network selection (Stacks Mainnet/Testnet)
- Static analysis for vulnerabilities
- Syntax and logic verification
- Wallet validation and balance check
- Transaction fee estimation
- Real-time monitoring of the deployment process
- Transaction confirmation tracking

## Requirements

- Visual Studio Code 1.60.0 or higher
- **Active internet connection** (required at all times for AI-powered features)
- **Existing Clarity project structure** (the extension won't work without the necessary project files)
- Wallet with sufficient STX to cover deployment fees

## Installation

1. Open Visual Studio Code
2. Go to the Extensions tab (Ctrl+Shift+X)
3. Search for "Clarity AI Agent"
4. Click Install

## Usage

### Creating a Contract

1. Open the extension from the VSCode sidebar
2. Select the "Builder" tab
3. Describe the contract you want to create in natural language
4. The AI Agent will generate the contract based on your description
5. Review the contract preview
6. Optionally, request specific modifications to the generated contract
7. The extension will automatically create the contract file and update your project's TOML file

### Testing a Contract

1. Navigate to the "Testing" tab
2. Select the contract to test (example: nft.clar, collection.clar, wallet.clar, auth.clar)
3. Click "Run Tests" to execute the automated tests
4. Review the test results in the bottom panel

### Deploying a Contract

1. Go to the "Deployment" tab
2. Enter your private key wallet
3. Select the deployment network (Stacks Mainnet)
4. Click "Deploy"
5. Monitor the deployment progress and confirmations

## File Structure

The extension uses the following file structure:

```
project/
├── .vscode/
├── media/
│   └── templates/
│       ├── builder.html
│       ├── builder.svg
│       ├── clarity-icon.svg
│       ├── deployment.html
│       ├── index.html
│       ├── main.js
│       ├── rocket.svg
│       ├── styles.css
│       ├── testing.html
│       └── testing.svg
├── src/
│   └── test/
├── node_modules/
├── out/
├── dist/
└── README.md
```

## Benefits of Clarity AI Agent

- **AI-powered development**: Transform natural language descriptions into functional Clarity contracts
- **Project integration**: Automatically updates project files to integrate new contracts
- **Simplified testing**: Automatically generates test cases to validate your contracts' functionality
- **Secure deployment**: Performs automatic checks before deployment to prevent costly errors
- **All-in-one**: Unifies the entire workflow in a single interface within VSCode
- **Enhanced experience**: Ideal for both beginner and experienced Clarity developers

## Important Notes

- The extension requires an active internet connection at all times to communicate with the AI Agent
- You must have a properly structured Clarity project for the extension to function correctly
- The extension automatically modifies your project's TOML file when creating new contracts

## Security

⚠️ **Important**: Never share your private key. The extension only uses your key to sign deployment transactions and does not store it permanently.

## Support

If you encounter any issues or have suggestions to improve Clarity AI Agent, please open an issue in the GitHub repository.


## Useful Links

- [Clarity Documentation](https://docs.stacks.co/clarity/introduction)
- [Stacks Blockchain](https://www.stacks.co/)
- [Stacks Developers Forum](https://forum.stacks.org/)