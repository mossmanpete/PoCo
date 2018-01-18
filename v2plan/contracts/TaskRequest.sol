pragma solidity ^0.4.18;

import "./OwnableOZ.sol";
import './IexecHubAccessor.sol';
import './IexecAPI.sol';

contract TaskRequest is OwnableOZ, IexecHubAccessor
{
	/**
	 * Members
	 */
	address public m_workerPoolRequested;
	address public m_appRequested;
	address public m_datasetRequested;
	string  public m_taskParam;
	uint256 public m_taskCost;
	uint256 public m_askedTrust;
	bool    public m_dappCallback;

	/**
	 * Constructor
	 */
	function TaskRequest(
		address _iexecHubAddress,
		address _requester,
		address _workerPool,
		address _app,
		address _dataset,
		string  _taskParam,
		uint    _taskCost,
		uint    _askedTrust,
		bool    _dappCallback)
	IexecHubAccessor(_iexecHubAddress)
	public
	{
		require(_requester != address(0));
		transferOwnership(_requester); // owner → tx.origin

		m_workerPoolRequested = _workerPool;
		m_appRequested        = _app;
		m_datasetRequested    = _dataset;
		m_taskParam           = _taskParam;
		m_taskCost            = _taskCost;
		m_askedTrust          = _askedTrust;
		m_dappCallback        = _dappCallback;
	}

	/**
	 * function
	 */
	 function cancelTask() public onlyOwner returns(bool)
	 {
		 require(iexecHubInterface.cancelTask(this));
		 return true;
	 }

		//optional dappCallback call can be done
		function taskRequestCallback(
			address _taskId,
			string  _stdout,
			string  _stderr,
			string _uri)
		public returns (bool)
		{
			require(this       == _taskId              );
			require(msg.sender == m_workerPoolRequested);

			require(IexecAPI(m_owner).taskRequestCallback(
				_taskId,
				_stdout,
				_stderr,
				_uri
			));
			return true;
	 	}



}