"use client";

import { useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import {
  GenerateAuthenticationOptionsOpts,
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { NextPage } from "next";
import { useLocalStorage } from "usehooks-ts";
import { loadBurnerSK } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  // const { address } = useAccount();

  const [verifiedRegistration, setVerifiedRegistration] = useLocalStorage<any>("registerWebAuth", undefined);
  const [largeBlobKey, setLargeBlobKey] = useState<any>(undefined);

  const burnerPk = loadBurnerSK();
  const onRegister = async () => {
    const opts: GenerateRegistrationOptionsOpts = {
      rpName: "SimpleWebAuthn Example",
      rpID: window.location.hostname,
      userID: `test`,
      userName: `test`,
      timeout: 60000,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "required",
      },
      /**
       * Support the two most common algorithms: ES256, and RS256
       */
      supportedAlgorithmIDs: [-7, -257],
    };

    // this option generation can be moved to server
    const options = await generateRegistrationOptions(opts);

    const authRegisterResponse = await startRegistration({
      ...options,
      extensions: {
        //@ts-ignore
        largeBlob: {
          support: "required",
        },
      },
    });
    const opts2: VerifyRegistrationResponseOpts = {
      response: authRegisterResponse,
      expectedChallenge: `${options.challenge}`,
      expectedOrigin: window.location.origin,
      expectedRPID: window.location.hostname,
      requireUserVerification: true,
    };
    const verification = await verifyRegistrationResponse(opts2);

    setVerifiedRegistration(verification as any);

    // ---store the private key

    const optsAuth: GenerateAuthenticationOptionsOpts = {
      timeout: 60000,
      userVerification: "required",
      rpID: window.location.hostname,
      allowCredentials: [
        {
          id: verification.registrationInfo?.credentialID as any,
          type: "public-key",
          transports: ["internal"],
        },
      ],
    };
    const encoder = new TextEncoder();

    const optionsAuth = await generateAuthenticationOptions({
      ...optsAuth,
      //@ts-ignore
      extensions: {
        //@ts-ignore
        largeBlob: {
          write: encoder.encode(burnerPk),
        },
      },
    });
    await startAuthentication({
      ...optionsAuth,
    });
  };

  const onSign = async () => {
    try {
      // const opts: GenerateAuthenticationOptionsOpts = {
      //   timeout: 60000,
      //   userVerification: "required",
      //   rpID: window.location.hostname,
      //   allowCredentials: [
      //     {
      //       id: verifiedRegistration.registrationInfo?.credentialID,
      //       type: "public-key",
      //       transports: ["internal"],
      //     },
      //   ],
      // };
      // const encoder = new TextEncoder();

      // const options = await generateAuthenticationOptions({
      //   ...opts,
      //   //@ts-ignore
      //   extensions: {
      //     //@ts-ignore
      //     largeBlob: {
      //       write: encoder.encode("cool"),
      //     },
      //   },
      // });
      // const asseResp = await startAuthentication({
      //   ...options,
      // });
      const opts: GenerateAuthenticationOptionsOpts = {
        timeout: 60000,
        userVerification: "required",
        rpID: window.location.hostname,
        allowCredentials: [
          {
            id: new Uint8Array(Object.values(verifiedRegistration.registrationInfo?.credentialID)),
            type: "public-key",
            transports: ["internal"],
          },
        ],
      };

      const options2 = await generateAuthenticationOptions({
        ...opts,
        //@ts-ignore
        extensions: {
          //@ts-ignore
          largeBlob: {
            read: true,
          },
        },
      });
      const asseResp2 = await startAuthentication({
        ...options2,
      });
      const decoder = new TextDecoder("utf-8");
      const blobPK = decoder.decode((asseResp2.clientExtensionResults as any)?.largeBlob.blob);
      setLargeBlobKey(blobPK);
    } catch (error) {}
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        {verifiedRegistration === undefined && (
          <button className="btn btn-primary" onClick={onRegister}>
            Register with passKey
          </button>
        )}

        {verifiedRegistration !== undefined && (
          <button className="btn btn-primary" onClick={onSign}>
            Sign In
          </button>
        )}
        <div>Private key from large blob</div>
        <div className="mockup-code bg-primary-content">
          <pre data-prefix="$">
            <code>{largeBlobKey && largeBlobKey}</code>
          </pre>
        </div>
      </div>
    </>
  );
};

export default Home;
