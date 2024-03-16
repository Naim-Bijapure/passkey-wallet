// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.0;

import {EllipticCurve} from "./EllipticCurve.sol";

error InvalidAuthenticatorData();
error InvalidClientData();
error InvalidSignature();

contract WebAuthn is EllipticCurve {
    function checkSignature(
        bytes memory authenticatorData,
        bytes1 authenticatorDataFlagMask,
        bytes memory clientData,
        string memory clientChallenge,
        uint256 clientChallengeDataOffset,
        uint256[2] memory rs,
        uint256[2] memory coordinates
    ) public pure returns (bool) {
        // Let the caller check if User Presence (0x01) or User Verification (0x04) are set
        if ((authenticatorData[32] & authenticatorDataFlagMask) != authenticatorDataFlagMask) {
            revert InvalidAuthenticatorData();
        }

        bytes memory challengeExtracted = new bytes(bytes(clientChallenge).length);

        copyBytes(clientData, clientChallengeDataOffset, challengeExtracted.length, challengeExtracted, 0);

        if (keccak256(abi.encodePacked(bytes(clientChallenge))) != keccak256(abi.encodePacked(challengeExtracted))) {
            revert InvalidClientData();
        }

        // Verify the signature over sha256(authenticatorData || sha256(clientData))
        bytes memory verifyData = new bytes(authenticatorData.length + 32);

        copyBytes(authenticatorData, 0, authenticatorData.length, verifyData, 0);

        copyBytes(abi.encodePacked(sha256(clientData)), 0, 32, verifyData, authenticatorData.length);

        bytes32 message = sha256(verifyData);
        //return EllipticCurve.validateSignature(message, rs, coordinates);
        return validateSignature(message, rs, coordinates);
    }

    function validate(
        bytes memory authenticatorData,
        bytes1 authenticatorDataFlagMask,
        bytes memory clientData,
        string memory clientChallenge,
        uint256 clientChallengeDataOffset,
        uint256[2] memory rs,
        uint256[2] memory coordinates
    ) public pure returns (bool) {
        if (
            !checkSignature(
                authenticatorData,
                authenticatorDataFlagMask,
                clientData,
                clientChallenge,
                clientChallengeDataOffset,
                rs,
                coordinates
            )
        ) {
            revert InvalidSignature();
        }
        return true;
    }

    /*
    The following function has been written by Alex Beregszaszi (@axic), use it under the terms of the MIT license
    */
    function copyBytes(bytes memory _from, uint256 _fromOffset, uint256 _length, bytes memory _to, uint256 _toOffset)
        internal
        pure
        returns (bytes memory _copiedBytes)
    {
        uint256 minLength = _length + _toOffset;
        require(_to.length >= minLength); // Buffer too small. Should be a better way?
        uint256 i = 32 + _fromOffset; // NOTE: the offset 32 is added to skip the `size` field of both bytes variables
        uint256 j = 32 + _toOffset;
        while (i < (32 + _fromOffset + _length)) {
            assembly {
                let tmp := mload(add(_from, i))
                mstore(add(_to, j), tmp)
            }
            i += 32;
            j += 32;
        }
        return _to;
    }

    function decodeSignature(bytes memory _signature)
        public
        pure
        returns (bytes memory, bytes1, bytes memory, string memory, uint256, uint256[2] memory)
    {
        (
            bytes memory authenticatorData,
            bytes1 authenticatorDataFlagMask,
            bytes memory clientData,
            string memory clientChallenge,
            uint256 clientChallengeDataOffset,
            uint256[2] memory rs
        ) = abi.decode(_signature, (bytes, bytes1, bytes, string, uint256, uint256[2]));

        return
            (authenticatorData, authenticatorDataFlagMask, clientData, clientChallenge, clientChallengeDataOffset, rs);
    }

    // function decodeSignature(
    // 	bytes memory _signature
    // ) public pure returns (bytes memory) {
    // 	bytes memory authenticatorData = abi.decode(_signature, (bytes));

    // 	return (authenticatorData);
    // }

    function getChallenge(bytes memory _signature) public pure returns (string memory) {
        (,,, string memory clientChallenge,,) = decodeSignature(_signature);
        return clientChallenge;
    }
}
