"use client";

import { useEffect, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import axios from "axios";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { useLocalStorage } from "usehooks-ts";
import { Hex } from "viem";
import { Address, AddressInput, Balance, EtherInput } from "~~/components/scaffold-eth";
import { loadBurnerSK, useBurnerWallet, useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { getPublicKeyCoordinates, getSignature } from "~~/utils/webauthn";

export default function Page({ params }: { params: { address: string } }) {
  const sk = loadBurnerSK();

  const [recipient, setRecipient] = useState<string>();
  const [recipientAmount, setRecipientAmount] = useState<string>();

  const [walletFactoryContract, setWalletFactoryContract] = useState<any>(undefined);
  const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);

  const [currentPubKey, setCurrentPubKey] = useLocalStorage<string | undefined>("currentPubKey", undefined);
  const [signInAuthData, setSignInAuthData] = useLocalStorage<any | undefined>("signInAuthData", undefined);
  let storedUserAddress = undefined;

  if (typeof window !== "undefined") {
    storedUserAddress = localStorage.getItem("userAddress");
  }
  const [userAddress] = useLocalStorage<any>("userAddress", storedUserAddress);
  const user = userAddress;

  const { address: burnerAddress } = params;
  // const [burnerPK, setBurnerPK] = useState<any>(undefined);

  const walletFactoryContractData = useDeployedContractInfo("WalletFactory");
  const walletContractData = useDeployedContractInfo("Wallet");
  const { account, saveBurner, generateNewBurner, walletClient } = useBurnerWallet();
  const provider = new ethers.providers.JsonRpcProvider(walletClient?.chain.rpcUrls.default.http[0]);
  const signer = new ethers.Wallet(sk, provider);

  // const walletFactoryContract = getContract({
  //   address: walletContractData?.data?.address as string,
  //   abi: walletContractData ? (walletContractData?.data?.abi as any) : [],
  //   walletClient,
  // });

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

          // set pub key of current  wallet
          setCurrentPubKey(verificationResponseData?.publicKey);

          setSignInAuthData({
            signature: asseResp2.response.signature,
            authenticatorData: asseResp2.response.authenticatorData,
            clientDataJSON: asseResp2.response.clientDataJSON,
            challenge: options.challenge,
          });

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
    setCurrentPubKey(undefined);
    setSignInAuthData(undefined);

    notification.success("Signed out successfully");
  };

  const onCreateWallet = async () => {
    try {
      const pubKeyCoordinates = await getPublicKeyCoordinates(currentPubKey);
      const deployWalletTx = await walletFactoryContract.deploy(account?.address + "6", pubKeyCoordinates as any, {
        gasLimit: 999999,
      });
      const deployWalletTxReceipt = await deployWalletTx.wait();
      console.log("deployWalletTxReceipt", deployWalletTxReceipt);
      const gasUsed = deployWalletTxReceipt?.gasUsed?.toString();
      console.log("gas used", gasUsed);

      await getCurrentWalletAddress(walletFactoryContract, account);

      notification.success("Wallet created successfully");
    } catch (error) {
      notification.error("Error in creating wallet");
      console.log("error", error);
    }
  };

  const getCurrentWalletAddress = async (walletFactoryContract: any, account: any) => {
    const walletAddress = await walletFactoryContract.userWallets(account?.address);
    if (walletAddress !== ethers.constants.AddressZero) {
      setWalletAddress(walletAddress);
    }
  };

  const onWalletSendTx = async () => {
    const signature = await getSignature(
      signInAuthData.signature,
      signInAuthData.authenticatorData,
      signInAuthData.clientDataJSON,
      signInAuthData.challenge,
    );
    const formattedSignature = ethers.utils.hexlify(signature);

    const WalletContract = new ethers.Contract(walletAddress as string, walletContractData?.data?.abi as any, signer);

    const sendTx = await WalletContract.send(
      recipient,
      ethers.utils.parseEther("" + parseFloat(recipientAmount ? recipientAmount : "0").toFixed(12)) as any,
      formattedSignature,
      {
        gasLimit: 9999999,
      },
    );
    const sendTxReceipt = await sendTx.wait();
    notification.success("Sent successfully");
  };

  useEffect(() => {
    if (walletFactoryContractData.data && walletFactoryContract === undefined) {
      const WalletFactoryContract = new ethers.Contract(
        walletFactoryContractData?.data?.address as string,
        walletFactoryContractData?.data?.abi as any,
        signer,
      );
      setWalletFactoryContract(WalletFactoryContract);
      getCurrentWalletAddress(WalletFactoryContract, account);
    }
  }, [walletFactoryContractData, walletFactoryContract, account]);

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

      <div className="my-2">
        <button
          className="btn btn-primary"
          onClick={onCreateWallet}

          // disabled={walletAddress !== undefined}
        >
          Create Wallet
        </button>
      </div>

      {/* current wallet info */}
      {walletAddress !== undefined && (
        <div key={walletAddress} className="card bg-base-100 shadow-xl w-[80%] m-2">
          <div>
            <div className="card-body">
              <div className="flex flex-col lg:flex-row justify-start items-center">
                <div className="m-2">Wallet</div>
                <QRCodeSVG
                  className="rounded-2xl w-50 lg:w-auto mb-4 lg:mb-0"
                  size={100}
                  value={walletAddress as string}
                ></QRCodeSVG>

                <div className="m-2 flex flex-col items-center">
                  <div className="ml-2">
                    <Address address={walletAddress} disableAddressLink />
                  </div>
                  <Balance address={walletAddress} />
                </div>
                {/* wallet action */}
                <div className="m-2 flex flex-col items-center">
                  <div className="w-full">
                    <AddressInput
                      placeholder="Recipient address"
                      value={recipient as string}
                      onChange={value => {
                        setRecipient(value);
                      }}
                    />
                  </div>

                  <div className="my-2">
                    <EtherInput
                      placeholder="Enter amount"
                      value={recipientAmount as string}
                      onChange={value => {
                        setRecipientAmount(value);
                      }}
                    />
                  </div>
                  <div>
                    <button
                      className="btn btn-primary"
                      disabled={recipient === undefined || recipientAmount === undefined}
                      onClick={async () => {
                        // const rcpt = await walletClient?.sendTransaction({
                        //   account,
                        //   to: recipient,
                        //   value: parseEther(recipientAmount as string),
                        // });
                        await onWalletSendTx();
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
            </div>
          </div>
        </div>
      )}

      {/* {account && <Address address={account.address} />} */}
      {/* <div className="p-8 flex flex-col items-center">
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
      </div> */}
    </div>
  );
}
