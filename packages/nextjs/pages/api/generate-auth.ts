import {
  GenerateAuthenticationOptionsOpts,
  GenerateRegistrationOptionsOpts,
  generateAuthenticationOptions,
  generateRegistrationOptions,
} from "@simplewebauthn/server";
import { TX_COLLECTION_NAME, UserData, isLocal, redis } from "~~/utils/constants";

const GENERATE_TYPES = {
  register: "register",
  auth: "auth",
};

export default async function handler(req: any, res: any) {
  //   const UserData: any[] = (await getUserData()) as any;
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" }); // 405 Method Not Allowed
    return;
  }

  const { type, rpID, userID, userName, extensions, address, isVerify, user } = req.body;
  if (type === GENERATE_TYPES.register) {
    const opts: GenerateRegistrationOptionsOpts = {
      rpName: "SimpleWebAuthn Example",
      rpID,
      userID,
      userName,
      timeout: 60000,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "required",
      },
      /**
       * Support the two most common algorithms: ES256, and RS256
       */
      supportedAlgorithmIDs: [-7, -257],
      extensions: {
        //@ts-ignore
        largeBlob: {
          support: "required",
        },
      },
    };

    const options = await generateRegistrationOptions(opts);

    res.status(200).json({ type: "register", options });
  }

  if (type === GENERATE_TYPES.auth) {
    const currentUser: any = isLocal ? UserData[address] : await redis.hget(TX_COLLECTION_NAME, address);
    // const currentUser: any = isLocal ? UserData[user] : await redis.hget(TX_COLLECTION_NAME, user);
    // const currentWallet = currentUser.find((wallet: any) => wallet.address === address);

    let allowCredentials: any = undefined;

    if (currentUser) {
      allowCredentials = [
        {
          id: new Uint8Array(Object.values(currentUser?.credentialID)),
          type: "public-key",
          transports: currentUser.transports,
        },
      ];
    }

    const opts: GenerateAuthenticationOptionsOpts = {
      timeout: 60000,
      userVerification: isVerify ? "required" : "preferred",
      rpID,
      extensions,
      allowCredentials,
    };

    const options = await generateAuthenticationOptions(opts);

    res.status(200).json({ text: "auth", options });
  }
}
