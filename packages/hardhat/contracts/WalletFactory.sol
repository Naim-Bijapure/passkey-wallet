// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/utils/Create2.sol";
import "hardhat/console.sol";

import "./Wallet.sol";

contract WalletFactory {
    mapping(address => address) public userWallets;
    address public webauthn;

    constructor(address _webauthn) {
        webauthn = _webauthn;
    }

    receive() external payable {}

    function deploy(string calldata _name, uint256[2] memory _walletPubKey) public payable {
        bytes32 _salt = keccak256(abi.encodePacked(abi.encode(_name, address(msg.sender))));

        /**
         * ----------------------
         * create2 implementation
         * ---------------------
         */
        address wallet_address = payable(
            Create2.deploy(
                msg.value,
                _salt,
                abi.encodePacked(
                    type(Wallet).creationCode,
                    // abi.encode(_name, address(this))
                    abi.encode(_name, address(msg.sender), _walletPubKey, webauthn)
                )
            )
        );

        userWallets[msg.sender] = wallet_address;
    }
}
