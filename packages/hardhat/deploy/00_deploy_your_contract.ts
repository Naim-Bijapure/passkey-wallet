import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "ethers";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network goerli`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // await deploy("YourContract", {
  //   from: deployer,
  //   // Contract constructor arguments
  //   args: [deployer],
  //   log: true,
  //   // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
  //   // automatically mining the contract deployment transaction. There is no effect on live networks.
  //   autoMine: true,
  // });

  // Get the deployed contract
  // const yourContract = await hre.ethers.getContract("YourContract", deployer);

  // DEPLOY Webauthn
  const webauthn = await deploy("WebAuthn", {
    from: deployer,
    // Contract constructor arguments
    args: [],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // DEPLOY WALLET FACTORY
  const walletFactory = await deploy("WalletFactory", {
    from: deployer,
    // Contract constructor arguments
    args: [webauthn.address],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // DEPLOY Wallet
  const pubKey =
    "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEybcDzlozQCk8AdqO-Gq28wtK3IszK-F8x_6p_T5ZUlIHE8LEI1-mhjuwozijwThwqRGRk-OX536NMkp8uQ5Eog";

  function bufferFromBase64(value) {
    return Buffer.from(value, "base64");
  }
  function bufferToHex(buffer) {
    return "0x".concat([...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join(""));
  }

  async function getKey(pubkey) {
    const algoParams = {
      name: "ECDSA",
      namedCurve: "P-256",
      hash: "SHA-256",
    };
    return await crypto.subtle.importKey("spki", pubkey, algoParams, true, ["verify"]);
  }
  async function getPublicKeyCoordinates(pubkey: string | undefined): Promise<BigNumber[]> {
    const pubKeyBuffer = bufferFromBase64(pubkey as string);
    const rawPubkey = await crypto.subtle.exportKey("jwk", await getKey(pubKeyBuffer));
    const { x, y } = rawPubkey;
    const pubkeyUintArray = [
      BigInt(bufferToHex(bufferFromBase64(x as string))),
      BigInt(bufferToHex(bufferFromBase64(y as string))),
    ];

    return pubkeyUintArray;
  }

  const publicKeyCoordinate = await getPublicKeyCoordinates(pubKey);

  const wallet = await deploy("Wallet", {
    from: deployer,
    // Contract constructor arguments
    args: ["test_wallet", deployer, publicKeyCoordinate, webauthn.address],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourContract.tags = ["WalletFactory", "WebAuthn", "Wallet"];
