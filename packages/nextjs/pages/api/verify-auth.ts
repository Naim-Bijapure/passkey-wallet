import {
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifyAuthenticationResponseOpts,
  VerifyRegistrationResponseOpts,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { AuthenticatorDevice } from "@simplewebauthn/typescript-types";
import { TX_COLLECTION_NAME, UserData, isLocal, redis } from "~~/utils/constants";

const VERIFY_TYPES = {
  register: "register",
  auth: "auth",
};
export default async function handler(req: any, res: any) {
  //   const UserData: any[] = (await getUserData()) as any;
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" }); // 405 Method Not Allowed
    return;
  }

  const { type, rpID, authResponse, expectedChallenge, expectedOrigin, authenticator, address, user } = req.body;
  if (type === VERIFY_TYPES.register) {
    //   const expectedChallenge = req.session.currentChallenge;

    const opts: VerifyRegistrationResponseOpts = {
      response: authResponse,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    };
    const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse(opts);

    if (verification.verified) {
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo as any;
      const newDevice: AuthenticatorDevice = {
        credentialPublicKey: credentialPublicKey,
        credentialID,
        counter,
        transports: authResponse.response.transports,
      };
      if (isLocal) {
        UserData[address] = { ...newDevice, address };

        // if (UserData[user]) {
        //   UserData[user].push({ ...newDevice, address });
        // } else {
        //   UserData[user] = [{ ...newDevice, address }];
        // }
      } else {
        await redis.hset(TX_COLLECTION_NAME, { [address]: { ...newDevice, address } });

        // let currentUser: any = await redis.hget(TX_COLLECTION_NAME, user);
        // if (currentUser !== null) {
        //   currentUser.push({ ...newDevice, address });
        // } else {
        //   currentUser = [{ ...newDevice, address }];
        // }
        // await redis.hset(TX_COLLECTION_NAME, { [user]: currentUser });
      }
    }

    res.status(200).json({ type: "register", verification });
  }

  if (type === VERIFY_TYPES.auth) {
    // const response: AuthenticationResponseJSON = authResponse;

    const currentUser: any = isLocal ? UserData[address] : await redis.hget(TX_COLLECTION_NAME, address);

    // authenticator.credentialPublicKey = new Uint8Array(Object.values(authenticator.credentialPublicKey));
    // authenticator.credentialID = new Uint8Array(Object.values(authenticator.credentialID));

    // access from server stored data
    const authenticator: any = {
      ...currentUser,
      credentialPublicKey: isLocal
        ? new Uint8Array(currentUser.credentialPublicKey)
        : new Uint8Array(Object.values(currentUser.credentialPublicKey)),
      credentialID: isLocal
        ? new Uint8Array(currentUser.credentialID)
        : new Uint8Array(Object.values(currentUser.credentialID)),
    };

    const opts: VerifyAuthenticationResponseOpts = {
      response: authResponse,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator,
      requireUserVerification: true,
    };
    const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse(opts);

    res.status(200).json({ text: "auth", verification });
  }
}
