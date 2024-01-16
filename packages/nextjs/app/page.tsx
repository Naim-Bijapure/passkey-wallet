"use client";

import { useEffect, useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import axios from "axios";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { loadBurnerSK, saveBurnerSK } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const { address } = useAccount();

  // const [verifiedRegistration, setVerifiedRegistration] = useLocalStorage<any>("registerWebAuth", undefined);
  const [largeBlobKey, setLargeBlobKey] = useState<any>(undefined);

  const burnerPk = loadBurnerSK();

  const onRegister = async () => {
    try {
      const reqData = {
        type: "register",
        rpID: window.location.hostname,
        userID: address,
        userName: address,
      };
      const response = await axios.post("/api/generate-auth", { ...reqData });
      const responseData = await response.data;
      const { options } = responseData;
      const authRegisterResponse = await startRegistration({
        ...options,
      });
      // verify registration
      const reqDataVerifyData = {
        type: "register",
        authResponse: authRegisterResponse,
        expectedChallenge: options.challenge,
        rpID: window.location.hostname,
        expectedOrigin: window.location.origin,
        address,
      };
      await axios.post("/api/verify-auth", { ...reqDataVerifyData });
      // const responseVerifyData = await responseVerify.data;
      // const { verification } = responseVerifyData;

      const encoder = new TextEncoder();
      const reqDataWritePk = {
        type: "auth",
        rpID: window.location.hostname,
        userID: address,
        userName: address,
        address,
      };

      // GET OPTIONS
      const responseWritePk = await axios.post("/api/generate-auth", { ...reqDataWritePk });
      const { options: optionsStorePk } = await responseWritePk.data;

      // AUTHENTICATE
      const resultPkStored = await startAuthentication({
        ...optionsStorePk,
        // add large blob private key
        extensions: {
          largeBlob: {
            write: encoder.encode(burnerPk),
          },
        },
      });

      console.log("resultPkStored", resultPkStored);
      // VERIFY
      // setVerifiedRegistration(verification as any);
      notification.success("Registration successful");
    } catch (error) {
      console.log("error register", error);
    }
  };

  const onSign = async () => {
    try {
      const reqData = {
        type: "auth",
        rpID: window.location.hostname,
        userID: address,
        userName: address,
        extensions: {
          largeBlob: {
            read: true,
          },
        },
        address,
      };
      const response = await axios.post("/api/generate-auth", { ...reqData });
      const { options } = await response.data;
      // Base64URL decode the challenge
      // options.challenge = base64url.decode(options.challenge);

      // // `allowCredentials` empty array invokes an account selector by discoverable credentials.
      options.allowCredentials = [];

      const asseResp2 = await startAuthentication({
        ...options,
        mediation: "optional", // or "silent" or "required"
      });

      // const asseResp2 = await navigator.credentials.get({
      //   publicKey: options,
      //   mediation: "optional",
      // });

      const decoder = new TextDecoder("utf-8");
      if ((asseResp2?.clientExtensionResults as any)?.largeBlob?.blob) {
        const blobPK = decoder.decode((asseResp2?.clientExtensionResults as any)?.largeBlob.blob);
        setLargeBlobKey(blobPK);
      } else {
        notification.error("Large blob not supported");
      }
    } catch (error) {
      console.log("on sign error", error);
    }
  };

  useEffect(() => {
    if (largeBlobKey) {
      saveBurnerSK(largeBlobKey);
      if (window !== undefined) {
        window.location.reload();
      }
    }
  }, [largeBlobKey]);

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="flex justify-between w-[50%]">
          <button className="btn btn-primary" onClick={onRegister}>
            Register
          </button>

          <button className="btn btn-primary" onClick={onSign}>
            Sign In
          </button>
        </div>

        {/* CURRENT ACCOUNT CARD */}
        <div className="flex flex-col items-center">
          <span>You are currently singed in as</span>
          <span>
            <Address address={address} />
          </span>
        </div>

        {/* <div>Private key from large blob</div>
        <div className="text-warning">{isLargeBlobSupported === false && "Webauthn large blob not supported"}</div>
        <div className="mockup-code bg-primary-content">
          <pre data-prefix="$">
            <code>{largeBlobKey && largeBlobKey}</code>
          </pre>
        </div> */}
      </div>
    </>
  );
};

export default Home;
