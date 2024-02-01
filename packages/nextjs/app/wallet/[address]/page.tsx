"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import axios from "axios";
import { useLocalStorage } from "usehooks-ts";
import { Hex, etherUnits, formatEther, parseEther } from "viem";
import { Address, AddressInput, Balance, EtherInput } from "~~/components/scaffold-eth";
import { useBurnerWallet } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export default function Page({ params }: { params: { address: string } }) {
  const [recipient, setRecipient] = useState<string>();
  const [recipientAmount, setRecipientAmount] = useState<string>();

  let storedUserAddress = undefined;

  if (typeof window !== "undefined") {
    storedUserAddress = localStorage.getItem("userAddress");
  }
  const [userAddress] = useLocalStorage<any>("userAddress", storedUserAddress);
  const user = userAddress;

  const { address: burnerAddress } = params;
  // const [burnerPK, setBurnerPK] = useState<any>(undefined);

  const { account, saveBurner, generateNewBurner, walletClient } = useBurnerWallet();

  const onSignIn = async () => {
    try {
      const reqData = {
        type: "auth",
        rpID: window.location.hostname,
        userID: burnerAddress,
        userName: burnerAddress,
        extensions: {
          largeBlob: {
            read: true,
          },
        },
        address: burnerAddress,
        user: user,
      };
      const response = await axios.post("/api/generate-auth", { ...reqData });
      const { options } = await response.data;
      const asseResp2 = await startAuthentication({
        ...options,
        // mediation: "optional", // or "silent" or "required"
        // userVerification: "discouraged",
      });

      // VERIFY SIGN AUTHENTICATION
      const reqVerifyAuthData = {
        type: "auth",
        authResponse: asseResp2,
        expectedChallenge: options.challenge,
        rpID: window.location.hostname,
        expectedOrigin: window.location.origin,
        address: burnerAddress,
      };
      const verificationResponse = await axios.post("/api/verify-auth", { ...reqVerifyAuthData });
      const verificationResponseData = await verificationResponse.data;

      if (verificationResponseData.verification.verified) {
        const decoder = new TextDecoder("utf-8");
        if ((asseResp2?.clientExtensionResults as any)?.largeBlob?.blob) {
          const blobPK = decoder.decode((asseResp2?.clientExtensionResults as any)?.largeBlob.blob);
          saveBurner(blobPK as Hex);
          notification.success("Signed in successfully");
        } else {
          notification.error("Large blob not supported");
        }
      } else {
        notification.error("User not verified");
      }
    } catch (error) {
      console.log("on sign error", error);
    }
  };

  const onSignOut = async () => {
    generateNewBurner();

    notification.success("Signed out successfully");
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-8">
      <div className="self-end mx-10" key={account?.address}>
        {burnerAddress !== account?.address && (
          <>
            <button className="btn btn-sm btn-primary" onClick={onSignIn}>
              Sign in
            </button>
          </>
        )}

        {burnerAddress === account?.address && (
          <>
            <button className="btn btn-sm btn-warning" onClick={onSignOut}>
              Sign out
            </button>
          </>
        )}
      </div>
      <div className="flex">
        <Address address={burnerAddress} />
        <Balance address={burnerAddress} />
      </div>

      {/* {account && <Address address={account.address} />} */}
      <div className="p-8 flex flex-col items-center">
        {/* <div>Burner wallet tx actions can be implemented here</div> */}
        <div className="w-[80%]">
          <AddressInput
            placeholder="Enter recipient address"
            value={recipient as string}
            onChange={value => {
              setRecipient(value);
            }}
          />
        </div>

        <div className="my-2 w-[80%]">
          <EtherInput
            placeholder="Enter eth"
            value={recipientAmount as string}
            onChange={value => {
              setRecipientAmount(value);
            }}
          />
        </div>
        <div className="">
          <button
            className="btn btn-primary"
            disabled={burnerAddress !== account?.address}
            onClick={async () => {
              const rcpt = await walletClient?.sendTransaction({
                account,
                to: recipient,
                value: parseEther(recipientAmount as string),
              });
              setRecipient("");
              setRecipientAmount("");
              notification.success(`Sent successfully`);
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
