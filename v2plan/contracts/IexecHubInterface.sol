pragma solidity ^0.4.18;

contract IexecHubInterface
{
		/*
		function IexecHub(
			address _tokenAddress,
			address _workerPoolHubAddress,
			address _appHubAddress,
			address _datasetHubAddress,
			address _taskRequestHubAddress)
		public;
		*/

		function createWorkerPool(
			string _name)
		public returns(address createdWorkerPool);

		function createApp(
			string _appName,
			uint256 _appPrice,
			string _appParam,
			string _appUri)
		public returns(address createdApp);

		function createDataset(
			string _datasetName,
			uint256 _datasetPrice,
			string _datasetParam,
			string _datasetUri)
		public returns(address createdDataset);

		function createTaskRequest(
			address _workerPool,
			address _app,
			address _dataset,
			string _taskParam,
			uint _taskCost,
			uint _askedTrust,
			bool _dappCallback)
		public returns(address createdTaskRequest);

		function cancelTask(
			address _taskID)
		public returns (bool);

		function finalizedTask(
			address _taskID)
		public returns(bool);

		function openPool(
			address _workerPool)
		public returns(bool);

		function closePool(
			address _workerPool)
		public returns(bool);

		function subscribeToPool(
			address _workerPool)
		public returns(bool subscribed);

		function unsubscribeToPool(
			address _workerPool)
		public returns(bool unsubscribed);

		function scoreWinForTask(
			address _taskID,
			address _worker,
			uint _value)
		public returns(bool);

		function scoreLoseForTask(
			address _taskID,
			address _worker,
			uint _value)
		public returns(bool);

		function lockForTask(
			address _taskID,
			address _user,
			uint _amount)
		public returns(bool);

		function unlockForTask(
			address _taskID,
			address _user,
			uint _amount)
		public returns(bool);

		function rewardForTask(
			address _taskID,
			address _user,
			uint _amount)
		public returns(bool);

		function seizeForTask(
			address _taskID,
			address _user,
			uint _amount)
		public returns(bool);

	}
