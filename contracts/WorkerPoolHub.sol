pragma solidity ^0.4.18;

import './WorkerPool.sol';
import "./OwnableOZ.sol";
import "./SafeMathOZ.sol";

contract WorkerPoolHub is OwnableOZ // is Owned by IexecHub
{

	using SafeMathOZ for uint256;

	/**
	 * Members
	 */
	// worker => workerPool
	mapping(address => address)                     m_workerAffectation;
	// owner => index
	mapping(address => uint256)                     m_workerPoolCountByOwner;
	// owner => index => workerPool
	mapping(address => mapping(uint256 => address)) m_workerPoolByOwnerByIndex;
	//  workerPool => owner // stored in the workerPool
	/* mapping(address => address)                     m_ownerByWorkerPool; */
	mapping(address => bool)                        m_workerPoolRegistered;

	/**
	 * Constructor
	 */
	function WorkerPoolHub() public
	{
	}

	/**
	 * Methods
	 */
	function isWorkerPoolRegistered(address _workerPool) public view returns (bool)
	{
		return m_workerPoolRegistered[_workerPool];
	}
	function getWorkerPoolsCount(address _owner) public view returns (uint256)
	{
		return m_workerPoolCountByOwner[_owner];
	}
	function getWorkerPool(address _owner, uint256 _index) public view returns (address)
	{
		return m_workerPoolByOwnerByIndex[_owner][_index];
	}
	function getWorkerAffectation(address _worker) public view returns (address workerPool)
	{
		return m_workerAffectation[_worker];
	}

	function addWorkerPool(address _owner, address _workerPool) internal
	{
		uint id = m_workerPoolCountByOwner[_owner].add(1);
		m_workerPoolCountByOwner  [_owner]      = id;
		m_workerPoolByOwnerByIndex[_owner][id]  = _workerPool;
		m_workerPoolRegistered    [_workerPool] = true;
	}

	function createWorkerPool(
		string _name,
		uint256 _subscriptionLockStakePolicy,
		uint256 _subscriptionMinimumStakePolicy,
		uint256 _subscriptionMinimumScorePolicy,
		address _marketplaceAddress)
	external onlyOwner /*owner == IexecHub*/ returns (address createdWorkerPool)
	{
		// tx.origin == owner
		// msg.sender == IexecHub
		// At creating ownership is transfered to tx.origin
		address newWorkerPool = new WorkerPool(
			msg.sender, // iexecHubAddress
			_name,
			_subscriptionLockStakePolicy,
			_subscriptionMinimumStakePolicy,
			_subscriptionMinimumScorePolicy,
			_marketplaceAddress
		);
		addWorkerPool(tx.origin, newWorkerPool);
		return newWorkerPool;
	}

	function registerWorkerAffectation(address _workerPool, address _worker) public onlyOwner /*owner == IexecHub*/ returns (bool subscribed)
	{
		// tx.origin = worker
		WorkerPool pool = WorkerPool(_workerPool);
		// you must have no cuurent affectation on others worker Pool
		require(m_workerAffectation[_worker] == address(0));
		// you must be on the white list of the worker pool to subscribe.
		require(pool.isWorkerAllowed(_worker));
		m_workerAffectation[_worker] = _workerPool;
		return true;
	}

	function unregisterWorkerAffectation(address _workerPool, address _worker) public onlyOwner /*owner == IexecHub*/ returns (bool unsubscribed)
	{
		require(m_workerAffectation[_worker] == _workerPool);
		m_workerAffectation[_worker] == address(0);
		return true;
	}
}
