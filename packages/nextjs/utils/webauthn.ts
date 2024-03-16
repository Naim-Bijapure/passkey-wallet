import { ethers } from "ethers";

function derToRS(der: any) {
  let offset = 3;
  let dataOffset;

  if (der[offset] == 0x21) {
    dataOffset = offset + 2;
  } else {
    dataOffset = offset + 1;
  }
  const r = der.slice(dataOffset, dataOffset + 32);
  offset = offset + der[offset] + 1 + 1;
  if (der[offset] == 0x21) {
    dataOffset = offset + 2;
  } else {
    dataOffset = offset + 1;
  }
  const s = der.slice(dataOffset, dataOffset + 32);
  return [r, s];
}

export async function getSignature(
  _signatureBase64: string,
  _authenticatorData: string,
  _clientData: string,
  _clientChallenge: string,
): Promise<ethers.BytesLike> {
  const signatureBuffer = bufferFromBase64(_signatureBase64);
  const signatureParsed = derToRS(signatureBuffer);

  const sig: ethers.BigNumber[] = [
    ethers.BigNumber.from(bufferToHex(signatureParsed[0])),
    ethers.BigNumber.from(bufferToHex(signatureParsed[1])),
  ];

  const authenticatorData = bufferFromBase64(_authenticatorData);
  const clientData = bufferFromBase64(_clientData);
  const challengeOffset = clientData.indexOf("226368616c6c656e6765223a", 0, "hex") + 12 + 1;

  const abiCoder = new ethers.utils.AbiCoder();
  const signature = abiCoder.encode(
    ["bytes", "bytes1", "bytes", "string", "uint", "uint[2]"],
    [authenticatorData, 0x01, clientData, _clientChallenge, challengeOffset, sig],
  );

  return ethers.utils.arrayify(signature);
}

function bufferFromBase64(value: any) {
  return Buffer.from(value, "base64");
}
function bufferToHex(buffer: any) {
  return "0x".concat([...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join(""));
}
async function getKey(pubkey: any) {
  const algoParams = {
    name: "ECDSA",
    namedCurve: "P-256",
    hash: "SHA-256",
  };
  return await crypto.subtle.importKey("spki", pubkey, algoParams, true, ["verify"]);
}

export async function getPublicKeyCoordinates(pubkey: string | undefined): Promise<ethers.BigNumber[] | undefined> {
  try {
    const pubKeyBuffer = bufferFromBase64(pubkey as string);
    const rawPubkey = await crypto.subtle.exportKey("jwk", await getKey(pubKeyBuffer));
    const { x, y } = rawPubkey;
    const pubkeyUintArray = [
      ethers.BigNumber.from(bufferToHex(bufferFromBase64(x as string))),
      ethers.BigNumber.from(bufferToHex(bufferFromBase64(y as string))),
    ];

    return pubkeyUintArray;
  } catch (error) {}
}
