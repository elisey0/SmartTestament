// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title Contract for creating Testaments by users
 * @notice When the time expires or the results of voting, heirs can withdraw approved tokens
 * @dev Using MerkleTree to save info about heirs
 */
contract SmartTestament is Ownable {
    using SafeERC20 for IERC20;

    /// @notice Struct for withdraw inheritance
    struct InheritedTokensAndShare {
        IERC20[] erc20Tokens;
        uint256 erc20Share;
    }

    /// @notice Struct for info about voting in testament
    struct Voting {
        uint256 approvedVotes;
        uint256 neededVotes;
        uint256 confirmationTime;
        address[] guardians;
    }

    /// @notice Struct for testaments
    struct Testament {
        uint256 expirationTime;
        bytes32 erc20HeirsMerkleRoot;
        Voting voting;
    }

    /// @notice Struct for testament state
    enum TestamentState {
        NotExist,
        OwnerAlive,
        VoteActive,
        ConfirmationWaiting,
        Unlocked
    }

    uint256 public constant CONFIRMATION_LOCK = 180 days;
    uint256 public constant MIN_TESTAMENT_LOCK = 360 days;
    uint256 public constant CONTINGENCY_PERIOD = 360 * 10 days;
    uint256 public constant MAX_GUARDIANS = 20;
    uint256 public constant BASE_POINT = 10000; // 100%
    uint256 public constant FEE_BP = 100; // 1%

    address public feeAddress;

    mapping(address => Testament) public testaments;

    /// @dev testamentOwner  => token   =>  lastOwnerBalance
    mapping(address => mapping(address => uint256)) public lastOwnersBalances;

    /// @dev testamentOwner   =>  heir   =>  token  => already withdrawn
    mapping(address => mapping(address => bool)) public alreadyClaimed;

    /// @notice Param state must match current state or revert with _error
    modifier correctState(
        TestamentState _state,
        address _testamentOwner,
        string memory _error
    ) {
        require(getTestamentState(_testamentOwner) == _state, _error);
        _;
    }

    event CreatedTestament(address testamentOwner);
    event TestamentDeleted(address testamentOwner);
    event HeirsUpdated(address testamentOwner, bytes32 newErc20HeirsMerkleRoot);
    event GuardiansUpdated(
        address testamentOwner,
        uint256 neededVotes,
        address[] newGuardians
    );

    event TestatorAlive(address testamentOwner, uint256 newExpirationTime);
    event DeathConfirmed(address testamentOwner, uint256 deathConfirmationTime);
    event WithdrawTestament(address testamentOwner, address heir);

    /// @notice Deploy with address for fee collection
    constructor() {
        feeAddress = msg.sender;
    }

    /// @notice Handle ETH if somebody send it to contract address
    receive() external payable {}

    /// @notice Update address to collect fee from testaments
    function updateFeeAddress(address _feeAddress) external onlyOwner {
        feeAddress = _feeAddress;
    }

    /// @notice Withdraw voluntary donations for feeAddress
    function withdrawDonations() external onlyOwner {
        payable(feeAddress).transfer(address(this).balance);
    }

    /**
     * @notice Create testament
     * @param _needed: Need votes to confirm death
     * @param _guardians: array of guardians addresses
     * @param _erc20HeirsMerkleRoot: Merkle root of heirs and their shares
     */
    function createTestament(
        uint256 _lockTime,
        uint256 _needed,
        address[] calldata _guardians,
        bytes32 _erc20HeirsMerkleRoot
    )
        external
        payable
        correctState(TestamentState.NotExist, msg.sender, "Already exists")
    {
        require(
            _lockTime >= MIN_TESTAMENT_LOCK,
            "Lock time should be no less than 360 days"
        );

        checkVotingParam(_needed, _guardians.length);

        Testament memory newTestament = Testament(
            block.timestamp + MIN_TESTAMENT_LOCK,
            _erc20HeirsMerkleRoot,
            Voting(0, _needed, 0, _guardians)
        );

        testaments[msg.sender] = newTestament;

        emit CreatedTestament(msg.sender);
    }

    /**
     * @notice Update heirs
     * @param _newErc20HeirsMerkleRoot: generated root with info about heirs (addresses and shares)
     */
    function updateHeirs(
        bytes32 _newErc20HeirsMerkleRoot
    )
        external
        correctState(TestamentState.OwnerAlive, msg.sender, "Must be alive")
    {
        testaments[msg.sender].erc20HeirsMerkleRoot = _newErc20HeirsMerkleRoot;
        emit HeirsUpdated(msg.sender, _newErc20HeirsMerkleRoot);
    }

    /// @notice Update Guardians and needed votes
    function updateGuardians(
        uint256 _needed,
        address[] calldata _guardians
    )
        external
        correctState(TestamentState.OwnerAlive, msg.sender, "Must be alive")
    {
        checkVotingParam(_needed, _guardians.length);

        Testament storage userTestament = testaments[msg.sender];

        userTestament.voting.approvedVotes = 0;
        userTestament.voting.guardians = _guardians;
        userTestament.voting.neededVotes = _needed;
        emit GuardiansUpdated(msg.sender, _needed, _guardians);
    }

    /// @notice Delete testament for message sender
    function deleteTestament() external {
        delete testaments[msg.sender];
        emit TestamentDeleted(msg.sender);
    }

    /// @notice Confirm that testament owner (message sender) still alive
    function imAlive(uint256 _lockTime) external {
        require(
            _lockTime >= MIN_TESTAMENT_LOCK,
            "New lock time should be no less than 360 days"
        );
        TestamentState currentState = getTestamentState(msg.sender);
        require(
            currentState == TestamentState.OwnerAlive ||
                currentState == TestamentState.VoteActive,
            "State should be OwnerAlive or VoteActive, or Delete this testament"
        );
        Testament memory userTestament = testaments[msg.sender];

        if (currentState == TestamentState.VoteActive) {
            userTestament.voting.approvedVotes = 0;
            userTestament.expirationTime = block.timestamp + _lockTime;
        } else userTestament.expirationTime += _lockTime;

        testaments[msg.sender] = userTestament;

        emit TestatorAlive(msg.sender, userTestament.expirationTime);
    }

    /// @notice Vote or annul vote for unlock testament
    function voteForUnlock(
        address testamentOwner
    )
        external
        correctState(
            TestamentState.VoteActive,
            testamentOwner,
            "Voting is not active"
        )
    {
        Testament storage userTestament = testaments[testamentOwner];
        Voting memory voting = userTestament.voting;

        for (uint256 i = 0; i < voting.guardians.length; ) {
            if (
                msg.sender == voting.guardians[i] &&
                voting.approvedVotes & (1 << i) == 0
            ) {
                voting.approvedVotes |= (1 << i);
            }
            i++;
        }
        userTestament.voting.approvedVotes = voting.approvedVotes;

        if (
            _getApproveVotesAmount(voting.approvedVotes) >= voting.neededVotes
        ) {
            userTestament.voting.confirmationTime =
                block.timestamp +
                CONFIRMATION_LOCK;
            emit DeathConfirmed(
                testamentOwner,
                userTestament.voting.confirmationTime
            );
        }
    }

    /**
     * @notice withdraw testament after death confirmation call from heirs
     * @param testamentOwner: testament creator
     * @param tokens: {IERC20[] erc20Tokens; erc20Share;NFTinfo[] erc721Tokens;NFTinfo[] erc1155Tokens;}
     * erc20Tokens: array of erc20 tokens
     * erc721Tokens: array of {address nftAddress;uint256[] ids;} objects
     * erc1155Tokens: array of {address nftAddress;uint256[] ids;} objects
     * @param merkleProof: merkleProof for withdrawing address
     */
    function withdrawTestament(
        address testamentOwner,
        InheritedTokensAndShare calldata tokens,
        bytes32[] calldata merkleProof
    )
        external
        correctState(
            TestamentState.Unlocked,
            testamentOwner,
            "Testament must be Unlocked"
        )
    {
        require(tokens.erc20Tokens.length <= 100, "Too many tokens");
        require(
            isHeir(testamentOwner, tokens.erc20Share, merkleProof),
            "Not the Heir"
        );
        require(!alreadyClaimed[testamentOwner][msg.sender], "Already claimed");

        mapping(address => uint256)
            storage lastOwnerBalance = lastOwnersBalances[testamentOwner];

        for (uint256 i = 0; i < tokens.erc20Tokens.length; ) {
            uint256 lastTokenOwnerBalance = lastOwnerBalance[
                address(tokens.erc20Tokens[i])
            ];

            if (lastTokenOwnerBalance == 0) {
                uint256 tempTokenOwnerBalance = tokens.erc20Tokens[i].balanceOf(
                    testamentOwner
                );
                uint256 feeAmount = (tempTokenOwnerBalance * FEE_BP) /
                    BASE_POINT;
                if (feeAmount > 0) {
                    IERC20(tokens.erc20Tokens[i]).safeTransferFrom(
                        testamentOwner,
                        feeAddress,
                        feeAmount
                    );
                    tempTokenOwnerBalance -= feeAmount;
                    if (tempTokenOwnerBalance > BASE_POINT) {
                        lastTokenOwnerBalance =
                            tempTokenOwnerBalance /
                            BASE_POINT;
                        lastOwnerBalance[
                            address(tokens.erc20Tokens[i])
                        ] = lastTokenOwnerBalance;
                    }
                }
            }
            uint256 erc20Amount = tokens.erc20Share * lastTokenOwnerBalance;
            if (erc20Amount > 0) {
                tokens.erc20Tokens[i].safeTransferFrom(
                    testamentOwner,
                    msg.sender,
                    erc20Amount
                );
            }
            i++;
        }
        alreadyClaimed[testamentOwner][msg.sender] = true;
        emit WithdrawTestament(testamentOwner, msg.sender);
    }

    /// @notice Get amount of approved votes for testament
    function getApproveVotesAmount(
        address testamentOwner
    ) external view returns (uint256 approvedVotesAmount) {
        Voting memory voting = testaments[testamentOwner].voting;
        approvedVotesAmount = _getApproveVotesAmount(voting.approvedVotes);
    }

    /// @notice Get array of guardians for testament
    function getVotedGuardians(
        address testamentOwner
    ) external view returns (address[] memory) {
        Voting memory voting = testaments[testamentOwner].voting;
        address[] memory guardians = new address[](voting.guardians.length);
        if (guardians.length > 0 && voting.approvedVotes > 0) {
            uint256 count;
            for (uint256 i = 0; i < voting.guardians.length; ) {
                if (voting.approvedVotes & (1 << i) != 0) {
                    guardians[count] = voting.guardians[i];
                    count++;
                }
                i++;
            }

            assembly {
                mstore(guardians, count)
            }
        }
        return guardians;
    }

    /// @notice Check testaments state for owner
    function getTestamentState(
        address testamentOwner
    ) public view returns (TestamentState) {
        Testament memory userTestament = testaments[testamentOwner];
        Voting memory voting = userTestament.voting;
        // If testament not exist
        if (userTestament.expirationTime == 0) return TestamentState.NotExist;
        // If not vote not started yet
        if (block.timestamp < userTestament.expirationTime)
            return TestamentState.OwnerAlive;
        else {
            // If approved votes >= needed to unlock testament or time has passed more than CONTINGENCY_PERIOD
            if (
                _getApproveVotesAmount(voting.approvedVotes) >=
                voting.neededVotes ||
                block.timestamp >
                userTestament.expirationTime + CONTINGENCY_PERIOD
            ) {
                // If still waiting updates from testament owner
                if (block.timestamp < voting.confirmationTime)
                    return TestamentState.ConfirmationWaiting;

                return TestamentState.Unlocked;
            }
            return TestamentState.VoteActive;
        }
    }

    /// @notice Validate merkleProof for message sender and root in testament
    function isHeir(
        address testamentOwner,
        uint256 erc20Share,
        bytes32[] calldata merkleProof
    ) public view returns (bool) {
        bytes32 node = keccak256(
            bytes.concat(keccak256(abi.encode(msg.sender, erc20Share)))
        );
        return (
            MerkleProof.verify(
                merkleProof,
                testaments[testamentOwner].erc20HeirsMerkleRoot,
                node
            )
        );
    }

    /// @notice Check guardian's length and needed votes
    function checkVotingParam(
        uint256 _needed,
        uint256 _guardiansLength
    ) private pure {
        require(_needed > 0, "Needed votes must be greater than null");
        require(_guardiansLength >= 2, "No less than two guardians");
        require(_guardiansLength <= MAX_GUARDIANS, "Too many guardians");
        require(
            _guardiansLength >= _needed,
            "Needed votes should <= Number of guardians"
        );
    }

    /// @notice Get amount of approved votes
    function _getApproveVotesAmount(
        uint256 approved
    ) private pure returns (uint256 guardiansCount) {
        while (approved > 0) {
            guardiansCount += approved & 1;
            approved >>= 1;
        }
    }
}
