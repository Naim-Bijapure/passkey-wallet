import { expect } from "chai";
import { ethers } from "hardhat";
import { YourContract } from "../typechain-types";

describe("YourContract", function () {
  // We define a fixture to reuse the same setup in every test.

  // let yourContract: YourContract;
  // before(async () => {
  //   const [owner] = await ethers.getSigners();
  //   const yourContractFactory = await ethers.getContractFactory("YourContract");
  //   yourContract = (await yourContractFactory.deploy(owner.address)) as YourContract;
  //   await yourContract.deployed();
  // });

  // describe("Deployment", function () {
  //   it("Should have the right message on deploy", async function () {
  //     expect(await yourContract.greeting()).to.equal("Building Unstoppable Apps!!!");
  //   });

  //   it("Should allow setting a new message", async function () {
  //     const newGreeting = "Learn Scaffold-ETH 2! :)";

  //     await yourContract.setGreeting(newGreeting);
  //     expect(await yourContract.greeting()).to.equal(newGreeting);
  //   });
  // });

  it.only("send eth ", async function () {
    console.log(`n-🔴 => function:`);
    const [owner] = await ethers.getSigners();

    let balance = await ethers.provider.getBalance(owner.address);
    console.log(`n-🔴 => balance:`, balance.toString());
    const TARGET_ADDRESS = "0x0EcB7E897a1244047bcd7f2C278b39CCFad049A3";
    const tx = await owner.sendTransaction({ value: ethers.parseEther("10"), to: TARGET_ADDRESS });
    await tx.wait();

    balance = await ethers.provider.getBalance(TARGET_ADDRESS);
    console.log(`n-🔴 => balance:`, balance.toString());
  });
});
