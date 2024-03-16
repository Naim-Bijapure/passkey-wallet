// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;
// import "hardhat/console.sol";

import "./webauthn/WebAuthn.sol";

contract Wallet {
    address payable public owner;
    string public name;
    uint256[2] public walletPubKey;
    WebAuthn public webauthn;

    constructor(string memory _name, address _owner, uint256[2] memory _walletPubKey, address _webauthn) payable {
        // owner = payable(msg.sender);
        owner = payable(_owner);
        name = _name;
        walletPubKey = _walletPubKey;
        webauthn = WebAuthn(_webauthn);
    }

    receive() external payable {}

    function send(address _recipient, uint256 _amount, bytes memory _signature) external {
        require(msg.sender == owner, "caller is not owner");
        require(_recipient != address(0), "invalid recipient address");

        bool verificationResult = isValidSignature(_signature);
        require(verificationResult, "Invalid signature");

        // Convert the recipient address to a payable address
        address payable payableRecipient = payable(_recipient);

        // Use call instead of transfer
        (bool success,) = payableRecipient.call{value: _amount}("");
        require(success, "Failed to send Ether");
    }

    function getBalance() external view returns (uint256) {
        // require(msg.sender == owner, "caller is not owner");
        return (address(this).balance);
    }

    function isValidSignature(bytes memory _signature) public view returns (bool) {
        (
            bytes memory authenticatorData,
            bytes1 authenticatorDataFlagMask,
            bytes memory clientData,
            string memory clientChallenge,
            uint256 clientChallengeDataOffset,
            uint256[2] memory rs
        ) = webauthn.decodeSignature(_signature);

        bool verificationResult = webauthn.validate(
            authenticatorData,
            authenticatorDataFlagMask,
            clientData,
            clientChallenge,
            clientChallengeDataOffset,
            rs,
            walletPubKey
        );
        return verificationResult;
    }

    function getOwner() external view returns (address) {
        // require(msg.sender == owner, "caller is not owner");
        return (address(owner));
    }
}
