"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createLightAccountAlchemyClient } from "@alchemy/aa-alchemy";
import { Hex, LocalAccountSigner, sepolia } from "@alchemy/aa-core";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import axios from "axios";
import type { NextPage } from "next";
import { useDebounce, useLocalStorage } from "usehooks-ts";
import { privateKeyToAccount } from "viem/accounts";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { InputBase } from "~~/components/scaffold-eth";
import { loadBurnerSK, useBurnerWallet } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const router = useRouter();
  // const { address, isConnected } = useAccount();
  const [userAddress, setUserAddress] = useLocalStorage<any>("userAddress", undefined);
  const [userWallets, setUserWallets] = useLocalStorage<any[]>("userWallets", []);
  const [isLoggedIn, setIsLoggedIn] = useLocalStorage<boolean>("isLoggedIn", false);
  const [currentLoginDetails, setCurrentLoginDetails] = useLocalStorage<any>("currentLoginDetails", undefined);
  const [walletName, setWalletName] = useLocalStorage<any>("walletName", undefined);

  const [smartAccount, setSmartAccount] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const address = useDebounce(userAddress, 500);
  const { account, generateNewBurner, saveBurner } = useBurnerWallet();
  const burnerAddress = account?.address;
  // local states
  // const [largeBlobKey, setLargeBlobKey] = useState<any>(undefined);

  const burnerPk = loadBurnerSK();
  const PRIVATE_KEY = burnerPk;
  const signer4337 = LocalAccountSigner.privateKeyToAccountSigner(PRIVATE_KEY);

  const load4337Client = async () => {
    // Create a smart account client to send user operations from your smart account
    const provider = await createLightAccountAlchemyClient({
      // get your Alchemy API key at https://dashboard.alchemy.com
      apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string,
      chain: sepolia,
      signer: signer4337,
    });
    const smartAccountAddress = provider.getAddress();
    setSmartAccount(smartAccountAddress);
  };

  const onCreateAccount = async () => {
    try {
      setIsLoading(true);
      const reqData = {
        type: "register",
        rpID: window.location.hostname,
        userID: walletName,
        userName: walletName,
      };
      const response = await axios.post("/api/generate-auth", { ...reqData });
      const responseData = await response.data;
      const { options } = responseData;

      // REGISTER
      const authRegisterResponse = await startRegistration({
        ...options,
      });
      // VERIFY REGISTRATION
      const reqDataVerifyData = {
        type: "register",
        authResponse: authRegisterResponse,
        expectedChallenge: options.challenge,
        rpID: window.location.hostname,
        expectedOrigin: window.location.origin,
        address: burnerAddress,
        user: walletName,
      };
      const responseVerify = await axios.post("/api/verify-auth", { ...reqDataVerifyData });
      const responseVerifyData = await responseVerify.data;
      const { verification } = responseVerifyData;
      console.log("verification", verification);

      if (verification.verified) {
        const encoder = new TextEncoder();
        const reqDataWritePk = {
          type: "auth",
          rpID: window.location.hostname,
          userID: burnerAddress,
          userName: burnerAddress,
          address: burnerAddress,
          isVerify: true,
          user: walletName,
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

        // VERIFY SIGN AUTHENTICATION
        const reqVerifyAuthData = {
          type: "auth",
          authResponse: resultPkStored,
          expectedChallenge: optionsStorePk.challenge,
          rpID: window.location.hostname,
          expectedOrigin: window.location.origin,
          address: burnerAddress,
        };
        const verificationResponse = await axios.post("/api/verify-auth", { ...reqVerifyAuthData });
        const verificationResponseData = await verificationResponse.data;

        // VERIFY AUTH
        if (verificationResponseData.verification.verified) {
          notification.success("Registration successful");

          (document.getElementById("CreateBurnerWallet") as HTMLDialogElement)?.close();

          // add burner wallet to user wallets in local storage
          //   setUserWallets([...userWallets, { address: burnerAddress }]);

          setIsLoggedIn(true);
          // generateNewBurner();
          router.push(`/wallet/${burnerAddress}`);
        } else {
          notification.error("Registration failed, not verified");
        }
      } else {
        notification.error("Registration failed, not verified");
      }
    } catch (error) {
      setIsLoading(true);
      console.log("error register", error);
    }
  };
  const onLogin = async () => {
    try {
      const reqData = {
        type: "auth",
        rpID: window.location.hostname,
        userID: walletName,
        userName: walletName,
        extensions: {
          largeBlob: {
            read: true,
          },
        },
        address: burnerAddress,
        isVerify: true,
      };
      const response = await axios.post("/api/generate-auth", { ...reqData });
      const { options, currentUser } = await response.data;
      // `allowCredentials` empty array invokes an account selector by discoverable credentials.
      options.allowCredentials = [];

      const asseResp2 = await startAuthentication({
        ...options,
        mediation: "optional", // or "silent" or "required"
      });
      const decoder = new TextDecoder("utf-8");
      if ((asseResp2?.clientExtensionResults as any)?.largeBlob?.blob) {
        const blobPK: string = decoder.decode((asseResp2?.clientExtensionResults as any)?.largeBlob.blob) as any;
        const account = privateKeyToAccount(blobPK as any);
        saveBurner(blobPK as Hex);

        const reqData = {
          user: account?.address,
        };
        const response = await axios.post("/api/user-wallets", { ...reqData });
        const userData = await response.data;
        setWalletName(userData.user.user);
        setIsLoggedIn(true);
        router.push(`/wallet/${burnerAddress}`);
      } else {
        notification.error("Large blob not supported");
      }
    } catch (error) {
      console.log("on sign error", error);
    }
  };

  const onModalOpen = async () => {
    (document.getElementById("createModal") as HTMLDialogElement).showModal();
  };

  const onModalClose = async (type: "create") => {
    if (type === "create") {
      (document.getElementById("createModal") as HTMLDialogElement).close();
    }
  };

  useEffect(() => {
    load4337Client();
  }, []);

  useEffect(() => {
    if (isLoggedIn && burnerAddress) {
      router.push(`/wallet/${burnerAddress}`);
    }
  }, [isLoggedIn, burnerAddress]);

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-[60%] md:pt-[10%]">
        <div className="flex items-center justify-center  ">
          <div className="">
            <LockClosedIcon width={60} />
          </div>
          <div className="text-xs self-end opacity-55">Passkeys x ERC-4337</div>
        </div>
        <button className="btn btn-primary btn-outline btn-sm w-[50%] my-2" onClick={onLogin}>
          login
        </button>

        <div>Or</div>
        <div>
          <button className="btn btn-secondary btn-xs btn-outline" onClick={onModalOpen}>
            Create a new account
          </button>
        </div>
        {/* create modal popup */}
        {/* receive modal */}
        <dialog id="createModal" className="modal modal-middle sm:modal-middle">
          <div className="modal-box ">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => onModalClose("create")}
            >
              ✕
            </button>
            <h3 className="font-bold text-lg">Create wallet</h3>
            <div className="flex flex-col items-center">
              <div>
                <InputBase
                  placeholder="Enter wallet name"
                  value={walletName}
                  onChange={value => {
                    setWalletName(value);
                  }}
                />
              </div>

              {isLoading && <span className="loading loading-ring loading-lg my-2"></span>}
            </div>

            <div className="modal-action">
              <button
                className="btn btn-secondary btn-md"
                onClick={onCreateAccount}
                disabled={!walletName || isLoading}
              >
                Create wallet
              </button>
            </div>
          </div>
        </dialog>
      </div>
    </>
  );
};

export default Home;
