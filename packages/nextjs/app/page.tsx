"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Address, AddressInput, Balance } from "../components/scaffold-eth";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import axios from "axios";
import type { NextPage } from "next";
import { QRCodeSVG } from "qrcode.react";
import { useDebounce, useLocalStorage } from "usehooks-ts";
import { privateKeyToAccount } from "viem/accounts";
import {
  ArrowDownOnSquareStackIcon as AddBurnerIcon,
  PlusCircleIcon as CreateWalletIcon,
  ArrowPathIcon as GenerateBurnerIcon,
} from "@heroicons/react/24/outline";
import { loadBurnerSK, useBurnerWallet } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  // const { address, isConnected } = useAccount();
  const [userAddress, setUserAddress] = useLocalStorage<any>("userAddress", undefined);
  const [userWallets, setUserWallets] = useLocalStorage<any[]>("userWallets", []);

  const address = useDebounce(userAddress, 500);
  const { account, generateNewBurner } = useBurnerWallet();
  const burnerAddress = account?.address;

  // local states
  // const [largeBlobKey, setLargeBlobKey] = useState<any>(undefined);

  const burnerPk = loadBurnerSK();

  const onRegister = async () => {
    try {
      const reqData = {
        type: "register",
        rpID: window.location.hostname,
        userID: burnerAddress,
        userName: burnerAddress,
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
        user: address,
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
          user: address,
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
          setUserWallets([...userWallets, { address: burnerAddress }]);

          generateNewBurner();
        } else {
          notification.error("Registration failed, not verified");
        }
      } else {
        notification.error("Registration failed, not verified");
      }
    } catch (error) {
      console.log("error register", error);
    }
  };

  // const onSign = async () => {
  //   try {
  //     const reqData = {
  //       type: "auth",
  //       rpID: window.location.hostname,
  //       userID: burnerAddress,
  //       userName: burnerAddress,
  //       extensions: {
  //         largeBlob: {
  //           read: true,
  //         },
  //       },
  //       address: burnerAddress,
  //     };
  //     const response = await axios.post("/api/generate-auth", { ...reqData });
  //     const { options } = await response.data;

  //     // `allowCredentials` empty array invokes an account selector by discoverable credentials.
  //     options.allowCredentials = [];

  //     const asseResp2 = await startAuthentication({
  //       ...options,
  //       mediation: "optional", // or "silent" or "required"
  //     });

  //     // const asseResp2 = await navigator.credentials.get({
  //     //   publicKey: options,
  //     //   mediation: "optional",
  //     // });

  //     const decoder = new TextDecoder("utf-8");
  //     if ((asseResp2?.clientExtensionResults as any)?.largeBlob?.blob) {
  //       const blobPK = decoder.decode((asseResp2?.clientExtensionResults as any)?.largeBlob.blob);
  //       setLargeBlobKey(blobPK);
  //     } else {
  //       notification.error("Large blob not supported");
  //     }
  //   } catch (error) {
  //     console.log("on sign error", error);
  //   }
  // };

  // const onLoadWallets = async () => {
  //   const response = await axios.post("/api/user-wallets", { user: address });
  //   const { user } = await response.data;
  //   setUserWallets(user);
  // };

  const onAddWallet = async () => {
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
        isVerify: true,
      };
      const response = await axios.post("/api/generate-auth", { ...reqData });
      const { options } = await response.data;

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
        // check userWallets contains the address
        const isWalletExist = userWallets.find(item => item.address === account.address);
        if (!isWalletExist) {
          setUserWallets([...userWallets, { address: account.address }]);
        } else {
          notification.warning("Wallet already added");
        }
      } else {
        notification.error("Large blob not supported");
      }
    } catch (error) {
      console.log("on sign error", error);
    }
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="flex flex-col items-center">
          <div className="flex justify-between">
            {/* sync burner */}
            <div className="">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  onAddWallet();
                }}
              >
                {<AddBurnerIcon width={35} />}
              </button>
            </div>

            {/* create burner passkey wallet */}
            <div className="">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  (document.getElementById("CreateBurnerWallet") as HTMLDialogElement).showModal();
                }}
              >
                {<CreateWalletIcon width={35} />}
              </button>
            </div>
          </div>

          <div>
            <span className="text text-success">Your passkey burner wallets</span>
          </div>
          {/* list of wallets */}
          <div>
            <div>
              {userWallets.map(item => {
                return (
                  <>
                    {/* <Address address={wallet.address} /> */}
                    <div key={item.address} className="card bg-base-100 shadow-xl w-full m-2">
                      <div>
                        <div className="card-body">
                          <div className="flex flex-col lg:flex-row justify-start items-center">
                            <QRCodeSVG
                              className="rounded-2xl w-50 lg:w-auto mb-4 lg:mb-0"
                              size={100}
                              value={item.address as string}
                            ></QRCodeSVG>

                            <div className="m-2 flex flex-col items-center">
                              <div className="ml-2">
                                <Address address={item.address} disableAddressLink />
                              </div>
                              <Balance address={item.address} />
                            </div>
                          </div>

                          <div className="card-actions justify-end">
                            <Link href={`/wallet/${item.address}`}>
                              <button className="btn btn-primary">View</button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* create wallet modal */}
      {/* You can open the modal using document.getElementById('ID').showModal() method */}
      <dialog id="CreateBurnerWallet" className="modal">
        <div className="modal-box">
          <form method="dialog">
            {/* if there is a button in form, it will close the modal */}
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="font-bold text-lg">Create burner wallet with passkey</h3>
          <div className="flex flex-col items-center">
            <div className="mx-2 flex ">
              <Address address={burnerAddress} />
              <button
                className="btn btn-ghost"
                onClick={() => {
                  generateNewBurner();
                }}
              >
                {<GenerateBurnerIcon width={25} />}
              </button>
            </div>
            <div className="m-2">
              <button
                className="btn btn-primary"
                onClick={() => {
                  onRegister();
                }}
              >
                Register
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
};

export default Home;
