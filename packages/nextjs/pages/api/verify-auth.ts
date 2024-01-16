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

  const { type, rpID, authResponse, expectedChallenge, expectedOrigin, authenticator, address } = req.body;
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
      } else {
        await redis.hset(TX_COLLECTION_NAME, { [address]: { ...newDevice, address } });
      }
    }

    res.status(200).json({ type: "register", verification });
  }

  if (type === VERIFY_TYPES.auth) {
    // const response: AuthenticationResponseJSON = authResponse;

    authenticator.credentialPublicKey = new Uint8Array(Object.values(authenticator.credentialPublicKey));
    authenticator.credentialID = new Uint8Array(Object.values(authenticator.credentialID));

    //     const currentUser = UserData.find(user => user.address === address);

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
