"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Address, AddressInput, Balance, EtherInput } from "../../../components/scaffold-eth";
import { AlchemySmartAccountClient, createLightAccountAlchemyClient } from "@alchemy/aa-alchemy";
import { LocalAccountSigner, sepolia } from "@alchemy/aa-core";
import axios from "axios";
import { BigNumber, ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { useLocalStorage } from "usehooks-ts";
import { parseEther } from "viem";
import {
  ArrowLeftStartOnRectangleIcon,
  ArrowUpRightIcon,
  PaperAirplaneIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { loadBurnerSK, useBurnerWallet } from "~~/hooks/scaffold-eth";

export default function Page({ params }: { params: { address: string } }) {
  const router = useRouter();
  const { account, generateNewBurner } = useBurnerWallet();

  const { address: burnerAddress } = params;
  const burnerPk = loadBurnerSK();

  const [isLoggedIn, setIsLoggedIn] = useLocalStorage<boolean>("isLoggedIn", false);

  const onLogout = async () => {
    setIsLoggedIn(false);
    router.push(`/`);
  };

  useEffect(() => {
    if (isLoggedIn === false) {
      router.push(`/`);
    }
  }, [isLoggedIn, burnerAddress]);

  return (
    <div className="flex items-center flex-col flex-grow pt-8 w-full">
      <div className="text-xl font-bold absolute  mr-[65%]">Settings</div>
      <div className="divider mt-6" />

      <div className="flex justify-between items-center w-full">
        <div className="mx-2 align-bottom">
          <div className="badge badge-primary badge-lg">Sepolia</div>
          <div className="text-xs opacity-50">testnet only</div>
        </div>
        <div className="mx-2">
          <button className="btn btn-error btn-outline btn-sm" onClick={onLogout}>
            Logout <ArrowLeftStartOnRectangleIcon width={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
