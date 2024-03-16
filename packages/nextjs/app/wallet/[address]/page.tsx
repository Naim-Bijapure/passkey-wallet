"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Address, AddressInput, Balance, EtherInput } from "../../../components/scaffold-eth";
import { AlchemySmartAccountClient, createLightAccountAlchemyClient } from "@alchemy/aa-alchemy";
import { LocalAccountSigner, sepolia } from "@alchemy/aa-core";
import { startAuthentication } from "@simplewebauthn/browser";
import axios from "axios";
import { BigNumber, ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { useLocalStorage } from "usehooks-ts";
import { Hex, parseEther } from "viem";
import { ArrowDownLeftIcon, ArrowUpRightIcon, PaperAirplaneIcon, WalletIcon } from "@heroicons/react/24/outline";
import { loadBurnerSK, useBurnerWallet } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export default function Page({ params }: { params: { address: string } }) {
  const router = useRouter();
  const { account, generateNewBurner } = useBurnerWallet();
  const { address: burnerAddress } = params;
  const burnerPk = loadBurnerSK();

  const [isLoggedIn, setIsLoggedIn] = useLocalStorage<boolean>("isLoggedIn", false);
  const [walletName, setWalletName] = useLocalStorage<any>("walletName", undefined);
  const [smartAccount, setSmartAccount] = useState<string>();
  const [tokenBalances, setTokenBalances] = useState<any>();
  const [provider4337, setProvider4337] = useState<AlchemySmartAccountClient>();
  const [recipient, setRecipient] = useState<string>();
  const [recipientAmount, setRecipientAmount] = useState<string>();
  const [isTxLoading, setTxLoading] = useState<boolean>(false);
  const [txSteps, setTxSteps] = useState<{
    STEP_1: boolean;
    STEP_2: boolean;
    STEP_3: boolean;
    STEP_ERROR: boolean;
  }>({
    STEP_1: false,
    STEP_2: false,
    STEP_3: false,
    STEP_ERROR: false,
  });

  const [txUserOpHash, setUserOpHash] = useState<string>("");
  const [finalTxHash, setFinalTxHash] = useState<string>("");

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
    setProvider4337(provider);
  };

  const onValidatePassKey = async () => {
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
        user: walletName,
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
          return true;
        } else {
          notification.error("Large blob not supported");
          return true;
        }
      } else {
        notification.error("User not verified");
        return false;
      }
    } catch (error) {
      console.log("on sign error", error);
    }
  };

  const onSend = async () => {
    setTxLoading(true);
    let steps: any = { ...txSteps, STEP_1: true };
    try {
      const validatePasskey = await onValidatePassKey();
      if (!validatePasskey) {
        return;
      }
      setTxSteps({ ...steps });
      const targetAddress = recipient as any;
      const { hash: uoHash } = (await provider4337?.sendUserOperation({
        uo: {
          target: targetAddress,
          data: "0x",
          value: parseEther(recipientAmount as string),
        },
      } as any)) as any;

      console.log("UserOperation Hash: ", uoHash); // Log the user operation hash
      setUserOpHash(uoHash as any);

      steps = { ...steps, STEP_2: true };
      setTxSteps({ ...steps });

      // Wait for the user operation to be mined
      const txHash = await provider4337?.waitForUserOperationTransaction({
        hash: uoHash,
      });

      steps = { ...steps, STEP_3: true };
      setTxSteps({ ...steps });
      setFinalTxHash(txHash as any);
      setTxLoading(false);

      console.log("Transaction Hash: ", txHash);
    } catch (error) {
      console.log(`n-🔴 => onSend => error:`, error);
      steps = { ...steps, STEP_ERROR: true };
      setTxSteps({ ...steps });
      setTxLoading(false);
    }
  };
  const onModalClose = async (type: "send" | "receive") => {
    if (type === "send") {
      setTxSteps({
        STEP_1: false,
        STEP_2: false,
        STEP_3: false,
        STEP_ERROR: false,
      });

      (document.getElementById("sendModal") as HTMLDialogElement).close();
      setRecipient("");
      setRecipientAmount("");
    }

    if (type === "receive") {
      (document.getElementById("receiveModal") as HTMLDialogElement).close();
    }
  };

  const fetchTokenBalances = async () => {
    const baseURL = `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
    const ownerAddr = smartAccount;
    const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    const usdc = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
    const dai = "0x6b175474e89094c44da98b954eedeac495271d0f";
    const matic = "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0";
    const data = JSON.stringify({
      jsonrpc: "2.0",
      method: "alchemy_getTokenBalances",
      params: [`${ownerAddr}`, [`${usdt}`, `${usdc}`, `${dai}`, `${matic}`]],
      id: 42,
    });

    const config = {
      method: "post",
      url: baseURL,
      headers: {
        "Content-Type": "application/json",
      },
      data: data,
    };
    const response = await axios(config);
    const tokenData = response.data["result"]["tokenBalances"];
    const tokens: any = {};
    for (const token of tokenData) {
      const contractAddr = token["contractAddress"];
      const testTokenBalance = token["tokenBalance"];
      // Convert the balance from hexadecimal to a BigNumber
      const balanceBigNumber = BigNumber.from(testTokenBalance);
      const digits = balanceBigNumber.toString().length;
      const balance = ethers.utils.formatUnits(balanceBigNumber, digits > 10 ? 18 : 6);
      if (contractAddr === usdt) {
        tokens["USDT"] = {
          logo: "https://cryptologos.cc/logos/tether-usdt-logo.png?v=029",
          balance: Number(balance).toFixed(2),
        };
      }

      if (contractAddr === usdc) {
        tokens["USDC"] = {
          logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=029",
          balance: Number(balance).toFixed(2),
        };
      }

      if (contractAddr === matic) {
        tokens["MATIC"] = {
          logo: "https://cryptologos.cc/logos/polygon-matic-logo.png?v=029",
          balance: Number(balance).toFixed(2),
        };
      }

      if (contractAddr === dai) {
        tokens["DAI"] = {
          logo: "https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png?v=029",
          balance: Number(balance).toFixed(2),
        };
      }

      console.log(`Balance: ${balance}`);
    }

    setTokenBalances(tokens);
  };

  useEffect(() => {
    load4337Client();
  }, []);

  useEffect(() => {
    if (smartAccount) {
      fetchTokenBalances();
    }
  }, [smartAccount]);

  useEffect(() => {
    if (isLoggedIn === false) {
      router.push(`/`);
    }
  }, [isLoggedIn, burnerAddress]);

  return (
    <div className="flex items-center flex-col flex-grow pt-8 w-full">
      {/* balance and account details */}
      <div className="p-2">
        <div className="card border-2 border-primary">
          <div className="card-body">
            <h2 className="card-title">
              <WalletIcon width={25} /> My Balance
            </h2>
            {walletName && <div className="text-xs opacity-50">{walletName ? walletName : ""}</div>}
            <div className="flex justify-center">
              <Address address={smartAccount} />
              <Balance address={smartAccount} />
            </div>
          </div>
        </div>
      </div>
      {/* action buttons */}
      <div className="flex justify-center w-full">
        <button
          className="btn btn-outline btn-lg rounded-xl border-2 w-[43%] mx-1 text-sm"
          onClick={() => {
            (document.getElementById("sendModal") as HTMLDialogElement).showModal();
          }}
        >
          <span>Send</span>
          <span>
            <ArrowUpRightIcon width={20} />
          </span>
        </button>
        <button
          className="btn btn-outline btn-lg rounded-xl border-2 w-[43%] mx-1 text-sm"
          onClick={() => {
            (document.getElementById("receiveModal") as HTMLDialogElement).showModal();
          }}
        >
          <span>Receive</span>
          <span>
            <ArrowDownLeftIcon width={20} />
          </span>
        </button>
      </div>

      {/* assets section */}
      <div className="my-5 mr-auto mx-5 w-[90%]">
        <div className="font-bold absolute mt-1">Balances</div>
        <div className="divider mt-8" />
        <div>
          {/* <button className="btn btn-primary" onClick={fetchTokenBalances}>
            Test
          </button> */}
          {tokenBalances &&
            Object.keys(tokenBalances).map(token => {
              return (
                <div key={token} className="flex justify-between items-center my-3">
                  <div className="flex items-center">
                    <Image
                      src={tokenBalances[token].logo}
                      alt="token logo"
                      className="w-8 h-8"
                      width={500}
                      height={500}
                    />
                    <span className="ml-2">{token}</span>
                  </div>
                  <span>{tokenBalances[token].balance}</span>
                </div>
              );
            })}
        </div>
      </div>
      {/* send modal */}
      <dialog id="sendModal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box h-full">
          {/* <form method="dialog"> */}
          {/* if there is a button in form, it will close the modal */}
          <button
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={() => onModalClose("send")}
          >
            ✕
          </button>
          {/* </form> */}
          <h3 className="font-bold text-lg">Send</h3>
          <div className="flex flex-col justify-center items-center">
            <div className="m-1 w-full">
              <AddressInput placeholder="Enter recipient address" value={recipient as string} onChange={setRecipient} />
            </div>

            <div className="m-1 w-full">
              <EtherInput placeholder="Enter amount" value={recipientAmount as string} onChange={setRecipientAmount} />
            </div>
          </div>
          <div className="modal-action">
            <button
              className="btn btn-secondary"
              onClick={() => {
                onSend();
              }}
              disabled={!recipient || !recipientAmount || isTxLoading}
            >
              Transfer <PaperAirplaneIcon width={20} />
            </button>
          </div>

          {/* timeline */}

          {isTxLoading && <span className="loading loading-dots loading-lg bg-accent" />}
          <ul className="timeline timeline-vertical timeline-compact my-2">
            <li className={`${txSteps["STEP_1"] === true ? "display" : "hidden"}`}>
              <div className="timeline-start timeline-box">ERC 4337 transaction initiated</div>
              <div className="timeline-middle">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 text-secondary"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <hr className="bg-secondary" />
            </li>
            <li className={`${txSteps["STEP_2"] === true ? "display" : "hidden"}`}>
              <hr className="bg-secondary" />
              <div className="timeline-middle">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 text-secondary"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="timeline-end timeline-box">User hash generated</div>
              <hr className="bg-secondary" />
            </li>
            <li className={`${txSteps["STEP_3"] === true ? "display" : "hidden"}`}>
              <hr className="bg-secondary" />
              <div className="timeline-start timeline-box">Transaction confirmed</div>
              <div className="timeline-middle">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 text-secondary"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <hr className="bg-secondary" />
            </li>
            <li className={`${txSteps["STEP_3"] === true ? "display" : "hidden"}`}>
              <hr className="bg-secondary" />
              <div className="timeline-start timeline-box">
                <a
                  className="link link-info flex justify-center items-center"
                  href={`https://app.jiffyscan.xyz/bundle/${finalTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>View transaction</span>
                  <span>
                    <ArrowUpRightIcon width={15} />
                  </span>
                </a>
              </div>
              <div className="timeline-middle">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 text-secondary"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </li>
            <li className={`${txSteps["STEP_ERROR"] === true ? "display" : "hidden"}`}>
              <hr className="bg-error" />
              <div className="timeline-start timeline-box">
                <a
                  className="link link-error flex justify-center items-center"
                  href={`https://app.jiffyscan.xyz/userOpHash/${txUserOpHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Transaction failed</span>
                  <span>
                    <ArrowUpRightIcon width={15} />
                  </span>
                </a>
              </div>
              <div className="timeline-middle">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 text-error"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </li>
          </ul>
        </div>
      </dialog>
      {/* receive modal */}
      <dialog id="receiveModal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box h-full">
          <button
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={() => onModalClose("receive")}
          >
            ✕
          </button>
          <h3 className="font-bold text-lg">Receive</h3>
          <div className="flex flex-col justify-center items-center">
            <QRCodeSVG
              className="rounded-2xl w-50 lg:w-auto mb-4 lg:mb-0"
              size={250}
              value={smartAccount as string}
            ></QRCodeSVG>

            <Address address={smartAccount} />
          </div>
          <div className="modal-action"></div>
        </div>
      </dialog>
    </div>
  );
}
