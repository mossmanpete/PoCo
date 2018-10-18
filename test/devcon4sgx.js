var RLC = artifacts.require("../node_modules/rlc-token//contracts/RLC.sol");
var IexecHub = artifacts.require("./IexecHub.sol");
var WorkerPoolHub = artifacts.require("./WorkerPoolHub.sol");
var AppHub = artifacts.require("./AppHub.sol");
var DatasetHub = artifacts.require("./DatasetHub.sol");
var WorkerPool = artifacts.require("./WorkerPool.sol");
var App = artifacts.require("./App.sol");
var WorkOrder = artifacts.require("./WorkOrder.sol");
var IexecLib = artifacts.require("./IexecLib.sol");
var Marketplace = artifacts.require("./Marketplace.sol");

const Promise = require("bluebird");
const fs = require("fs-extra");
//extensions.js : credit to : https://github.com/coldice/dbh-b9lab-hackathon/blob/development/truffle/utils/extensions.js
const Extensions = require("../utils/extensions.js");
const addEvmFunctions = require("../utils/evmFunctions.js");
const readFileAsync = Promise.promisify(fs.readFile);


addEvmFunctions(web3);
Promise.promisifyAll(web3.eth, {
  suffix: "Promise"
});
Promise.promisifyAll(web3.version, {
  suffix: "Promise"
});
Promise.promisifyAll(web3.evm, {
  suffix: "Promise"
});
Extensions.init(web3, assert);
var constants = require("./constants");

contract('IexecHub', function(accounts) {

  let scheduleProvider, resourceProvider, appProvider, datasetProvider, dappUser, dappProvider, iExecCloudUser, marketplaceCreator;
  let subscriptionLockStakePolicy = 0;
  let subscriptionMinimumStakePolicy = 10;
  let subscriptionMinimumScorePolicy = 0;
  let isTestRPC;
  let txMined;
  let txsMined;
  let testTimemout = 0;
  let aRLCInstance;
  let aIexecHubInstance;
  let aWorkerPoolHubInstance;
  let aAppHubInstance;
  let aDatasetHubInstance;
  let aMarketplaceInstance;

  //specific for test :
  let workerPoolAddress;
  let aWorkerPoolInstance;

  let appAddress;
  let aAppInstance;
  let aWorkOrderInstance;

  beforeEach("should prepare accounts and check TestRPC Mode", async() => {
    assert.isAtLeast(accounts.length, 9, "should have at least 8 accounts");
    scheduleProvider = accounts[0];
    resourceProvider = accounts[1];
    appProvider = accounts[2];
    datasetProvider = accounts[3];
    dappUser = accounts[4];
    dappProvider = accounts[5];
    iExecCloudUser = accounts[6];
    marketplaceCreator = accounts[7];
    SGXkeys = accounts[8];



    await Extensions.makeSureAreUnlocked(
      [scheduleProvider, resourceProvider, appProvider, datasetProvider, dappUser, dappProvider, iExecCloudUser]);
    let balance = await web3.eth.getBalancePromise(scheduleProvider);
    assert.isTrue(
      web3.toWei(web3.toBigNumber(80), "ether").lessThan(balance),
      "dappProvider should have at least 80 ether, not " + web3.fromWei(balance, "ether"));
    await Extensions.refillAccount(scheduleProvider, resourceProvider, 10);
    await Extensions.refillAccount(scheduleProvider, appProvider, 10);
    await Extensions.refillAccount(scheduleProvider, datasetProvider, 10);
    await Extensions.refillAccount(scheduleProvider, dappUser, 10);
    await Extensions.refillAccount(scheduleProvider, dappProvider, 10);
    await Extensions.refillAccount(scheduleProvider, iExecCloudUser, 10);
    await Extensions.refillAccount(scheduleProvider, marketplaceCreator, 10);

    console.log("scheduleProvider address : [" + scheduleProvider + "]");
    console.log("resourceProvider address : [" + resourceProvider + "]");
    let node = await web3.version.getNodePromise();
    isTestRPC = node.indexOf("EthereumJS TestRPC") >= 0;
    // INIT RLC
    aRLCInstance = await RLC.new({
      from: marketplaceCreator,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    console.log("aRLCInstance.address is ");
    console.log(aRLCInstance.address);
    let txMined = await aRLCInstance.unlock({
      from: marketplaceCreator,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    txsMined = await Promise.all([
      aRLCInstance.transfer(scheduleProvider, 1000, {
        from: marketplaceCreator,
        gas: constants.AMOUNT_GAS_PROVIDED
      }),
      aRLCInstance.transfer(resourceProvider, 1000, {
        from: marketplaceCreator,
        gas: constants.AMOUNT_GAS_PROVIDED
      }),
      aRLCInstance.transfer(appProvider, 1000, {
        from: marketplaceCreator,
        gas: constants.AMOUNT_GAS_PROVIDED
      }),
      aRLCInstance.transfer(datasetProvider, 1000, {
        from: marketplaceCreator,
        gas: constants.AMOUNT_GAS_PROVIDED
      }),
      aRLCInstance.transfer(dappUser, 1000, {
        from: marketplaceCreator,
        gas: constants.AMOUNT_GAS_PROVIDED
      }),
      aRLCInstance.transfer(dappProvider, 1000, {
        from: marketplaceCreator,
        gas: constants.AMOUNT_GAS_PROVIDED
      }),
      aRLCInstance.transfer(iExecCloudUser, 1000, {
        from: marketplaceCreator,
        gas: constants.AMOUNT_GAS_PROVIDED
      })
    ]);
    assert.isBelow(txsMined[0].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    assert.isBelow(txsMined[1].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    assert.isBelow(txsMined[2].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    assert.isBelow(txsMined[3].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    assert.isBelow(txsMined[4].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    assert.isBelow(txsMined[5].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    assert.isBelow(txsMined[6].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    let balances = await Promise.all([
      aRLCInstance.balanceOf(scheduleProvider),
      aRLCInstance.balanceOf(resourceProvider),
      aRLCInstance.balanceOf(appProvider),
      aRLCInstance.balanceOf(datasetProvider),
      aRLCInstance.balanceOf(dappUser),
      aRLCInstance.balanceOf(dappProvider),
      aRLCInstance.balanceOf(iExecCloudUser)
    ]);
    assert.strictEqual(balances[0].toNumber(), 1000, "1000 nRLC here");
    assert.strictEqual(balances[1].toNumber(), 1000, "1000 nRLC here");
    assert.strictEqual(balances[2].toNumber(), 1000, "1000 nRLC here");
    assert.strictEqual(balances[3].toNumber(), 1000, "1000 nRLC here");
    assert.strictEqual(balances[4].toNumber(), 1000, "1000 nRLC here");
    assert.strictEqual(balances[5].toNumber(), 1000, "1000 nRLC here");
    assert.strictEqual(balances[6].toNumber(), 1000, "1000 nRLC here");

    // INIT SMART CONTRACTS BY marketplaceCreator
    aWorkerPoolHubInstance = await WorkerPoolHub.new({
      from: marketplaceCreator
    });
    console.log("aWorkerPoolHubInstance.address is ");
    console.log(aWorkerPoolHubInstance.address);

    aAppHubInstance = await AppHub.new({
      from: marketplaceCreator
    });
    console.log("aAppHubInstance.address is ");
    console.log(aAppHubInstance.address);

    aDatasetHubInstance = await DatasetHub.new({
      from: marketplaceCreator
    });
    console.log("aDatasetHubInstance.address is ");
    console.log(aDatasetHubInstance.address);

    aIexecHubInstance = await IexecHub.new({
      from: marketplaceCreator
    });
    console.log("aIexecHubInstance.address is ");
    console.log(aIexecHubInstance.address);

    txMined = await aWorkerPoolHubInstance.setImmutableOwnership(aIexecHubInstance.address, {
      from: marketplaceCreator
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    console.log("setImmutableOwnership of WorkerPoolHub to IexecHub");

    txMined = await aAppHubInstance.setImmutableOwnership(aIexecHubInstance.address, {
      from: marketplaceCreator
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    console.log("setImmutableOwnership of AppHub to IexecHub");

    txMined = await aDatasetHubInstance.setImmutableOwnership(aIexecHubInstance.address, {
      from: marketplaceCreator
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    console.log("setImmutableOwnership of DatasetHub to IexecHub");

    aMarketplaceInstance = await Marketplace.new(aIexecHubInstance.address, {
      from: marketplaceCreator
    });
    console.log("aMarketplaceInstance.address is ");
    console.log(aMarketplaceInstance.address);

    txMined = await aIexecHubInstance.attachContracts(aRLCInstance.address, aMarketplaceInstance.address, aWorkerPoolHubInstance.address, aAppHubInstance.address, aDatasetHubInstance.address, {
      from: marketplaceCreator
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    console.log("attachMarketplace to IexecHub");

    // INIT categories in MARKETPLACE
    txMined = await aIexecHubInstance.setCategoriesCreator(marketplaceCreator, {
      from: marketplaceCreator
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    console.log("setCategoriesCreator  to marketplaceCreator");
    var categoriesConfigFile = await readFileAsync("./config/categories.json");
    var categoriesConfigFileJson = JSON.parse(categoriesConfigFile);
    for (var i = 0; i < categoriesConfigFileJson.categories.length; i++) {
      console.log("created category:");
      console.log(categoriesConfigFileJson.categories[i].name);
      console.log(JSON.stringify(categoriesConfigFileJson.categories[i].description));
      console.log(categoriesConfigFileJson.categories[i].workClockTimeRef);
      txMined = await aIexecHubInstance.createCategory(categoriesConfigFileJson.categories[i].name, JSON.stringify(categoriesConfigFileJson.categories[i].description), categoriesConfigFileJson.categories[i].workClockTimeRef, {
        from: marketplaceCreator
      });
      assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    }

    //INIT RLC approval on IexecHub for all actors
    txsMined = await Promise.all([
      aRLCInstance.approve(aIexecHubInstance.address, 100, {
        from: scheduleProvider,
        gas: constants.AMOUNT_GAS_PROVIDED
      }),
      aRLCInstance.approve(aIexecHubInstance.address, 100, {
        from: resourceProvider,
        gas: constants.AMOUNT_GAS_PROVIDED
      }),
      aRLCInstance.approve(aIexecHubInstance.address, 100, {
        from: appProvider,
        gas: constants.AMOUNT_GAS_PROVIDED
      }),
      aRLCInstance.approve(aIexecHubInstance.address, 100, {
        from: datasetProvider,
        gas: constants.AMOUNT_GAS_PROVIDED
      }),
      aRLCInstance.approve(aIexecHubInstance.address, 100, {
        from: dappUser,
        gas: constants.AMOUNT_GAS_PROVIDED
      }),
      aRLCInstance.approve(aIexecHubInstance.address, 100, {
        from: dappProvider,
        gas: constants.AMOUNT_GAS_PROVIDED
      }),
      aRLCInstance.approve(aIexecHubInstance.address, 100, {
        from: iExecCloudUser,
        gas: constants.AMOUNT_GAS_PROVIDED
      })
    ]);
    assert.isBelow(txsMined[0].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    assert.isBelow(txsMined[1].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    assert.isBelow(txsMined[2].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    assert.isBelow(txsMined[3].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    assert.isBelow(txsMined[4].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    assert.isBelow(txsMined[5].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    assert.isBelow(txsMined[6].receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");

    // INIT CREATE A WORKER POOL
    txMined = await aIexecHubInstance.createWorkerPool(
      "myWorkerPool",
      subscriptionLockStakePolicy,
      subscriptionMinimumStakePolicy,
      subscriptionMinimumScorePolicy, {
        from: scheduleProvider
      });
    workerPoolAddress = await aWorkerPoolHubInstance.getWorkerPool(scheduleProvider, 1);
    aWorkerPoolInstance = await WorkerPool.at(workerPoolAddress);

    // WORKER ADD deposit to respect workerpool policy
    txMined = await aIexecHubInstance.deposit(subscriptionLockStakePolicy + subscriptionMinimumStakePolicy, {
      from: resourceProvider,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    // WORKER SUBSCRIBE TO POOL
    txMined = await aWorkerPoolInstance.subscribeToPool({
      from: resourceProvider,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    // CREATE AN APP
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    txMined = await aIexecHubInstance.createApp("R Clifford Attractors", 0, constants.DAPP_PARAMS_EXAMPLE, {
      from: appProvider
    });
    appAddress = await aAppHubInstance.getApp(appProvider, 1);
    aAppInstance = await App.at(appAddress);


  });

  it("Existing SGX NON REG TEST", async function() {

    //Create ask Marker Order by scheduler
    txMined = await aIexecHubInstance.deposit(100, {
      from: scheduleProvider,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


    txMined = await aMarketplaceInstance.createMarketOrder(constants.MarketOrderDirectionEnum.ASK, 1  , 0  , 100  , workerPoolAddress  , 1  , {
      from: scheduleProvider
    });

    //answerAskOrder
    txMined = await aIexecHubInstance.deposit(100, {
      from: iExecCloudUser,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


    txMined = await aIexecHubInstance.buyForWorkOrder(1 , aWorkerPoolInstance.address, aAppInstance.address, 0, "noParam", 0, iExecCloudUser, {
      from: iExecCloudUser
    });

    events = await Extensions.getEventsPromise(aIexecHubInstance.WorkOrderActivated({}), 1, constants.EVENT_WAIT_TIMEOUT);
    woid = events[0].args.woid;
    console.log("woid is: " + woid);
    aWorkOrderInstance = await WorkOrder.at(woid);

    //allowWorkerToContribute
    txMined = await aWorkerPoolInstance.allowWorkerToContribute(woid, resourceProvider, SGXkeys, {
      from: scheduleProvider,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    m_statusCall = await aWorkOrderInstance.m_status.call();
    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.ACTIVE, "check m_status ACTIVE");

    //workerContribute
    assert.strictEqual(subscriptionMinimumStakePolicy, 10, "check stake sanity before contribution");
    assert.strictEqual(subscriptionLockStakePolicy, 0, "check stake sanity before contribution");
    txMined = await aIexecHubInstance.deposit(30, {
      from: resourceProvider,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");

    signed = await Extensions.signResult("iExec the wanderer", resourceProvider);
    sgxsign = web3.eth.sign(SGXkeys, signed.hash.substr(2, 64) + signed.sign.substr(2, 64));
    sgxsign_r = '0x' + sgxsign.substr(2, 64);
    sgxsign_s = '0x' + sgxsign.substr(66, 64);
    sgxsign_v = web3.toDecimal(sgxsign.substr(130, 2)) + 27;

    txMined = await aWorkerPoolInstance.contribute(woid, signed.hash, signed.sign, sgxsign_v, sgxsign_r, sgxsign_s, {
      from: resourceProvider,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    checkBalance = await aIexecHubInstance.checkBalance.call(resourceProvider);
    assert.strictEqual(checkBalance[0].toNumber(), 10, "check stake of the resourceProvider");
    assert.strictEqual(checkBalance[1].toNumber(), 30, "check stake locked of the resourceProvider : 30 + 10");

    //revealConsensus
    txMined = await aWorkerPoolInstance.revealConsensus(woid, Extensions.hashResult("iExec the wanderer"), {
      from: scheduleProvider,
      gas: constants.AMOUNT_GAS_PROVIDED
    });

    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    m_statusCall = await aWorkOrderInstance.m_status.call();
    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.REVEALING, "check m_status REVEALING");

    //revealContribution
    const result = web3.sha3("iExec the wanderer");
    txMined = await aWorkerPoolInstance.reveal(woid, result, {
      from: resourceProvider,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    m_statusCall = await aWorkOrderInstance.m_status.call();
    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.REVEALING, "check m_status REVEALING");




    checkBalance = await aIexecHubInstance.checkBalance.call(scheduleProvider);
    assert.strictEqual(checkBalance[0].toNumber(), 70, "check balance : stake");
    assert.strictEqual(checkBalance[1].toNumber(), 30, "check balance : locked . must lock 30%");

    txMined = await aWorkerPoolInstance.finalizeWork(woid, "aStdout", "aStderr", "anUri", {
      from: scheduleProvider,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");

    events = await Extensions.getEventsPromise(aIexecHubInstance.WorkOrderCompleted({}), 1, constants.EVENT_WAIT_TIMEOUT);
    assert.strictEqual(events[0].args.woid, woid, "woid check");
    assert.strictEqual(events[0].args.workerPool, aWorkerPoolInstance.address, "the aWorkerPoolInstance address check");

    m_statusCall = await aWorkOrderInstance.m_status.call();
    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.COMPLETED, "check m_status COMPLETED");

    results = await Promise.all([
      aWorkOrderInstance.m_stdout.call(),
      aWorkOrderInstance.m_stderr.call(),
      aWorkOrderInstance.m_uri.call()
    ]);
    assert.strictEqual(results[0], "aStdout", "check m_stdout");
    assert.strictEqual(results[1], "aStderr", "check m_stderr");
    assert.strictEqual(results[2], "anUri", "check m_uri");

    checkBalance = await aIexecHubInstance.checkBalance.call(resourceProvider);
    assert.strictEqual(checkBalance[0].toNumber(), 139, "check stake of the resourceProvider. won 99% of price (99). (initial balance 30+10=40)");
    assert.strictEqual(checkBalance[1].toNumber(), 0, "check stake locked of the resourceProvider: 10 form subscription lock ");

    checkBalance = await aIexecHubInstance.checkBalance.call(scheduleProvider);
    assert.strictEqual(checkBalance[0].toNumber(), 101, "check stake of the scheduleProvider. 100 unlocked + won 1% of price");
    assert.strictEqual(checkBalance[1].toNumber(), 0, "check stake locked of the scheduleProvider");
  });


  it("TEST NOUVEAU COMBO MAGIC", async function() {

    //Create ask Marker Order by scheduler
    txMined = await aIexecHubInstance.deposit(100, {
      from: scheduleProvider,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


    txMined = await aMarketplaceInstance.createMarketOrder(constants.MarketOrderDirectionEnum.ASK, 1 , 0  , 100  , workerPoolAddress , 1 , {
      from: scheduleProvider
    });

    //answerAskOrder
    txMined = await aIexecHubInstance.deposit(100, {
      from: iExecCloudUser,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


    txMined = await aIexecHubInstance.buyForWorkOrder(1  , aWorkerPoolInstance.address, aAppInstance.address, 0, "noParam", 0, iExecCloudUser, {
      from: iExecCloudUser
    });

    events = await Extensions.getEventsPromise(aIexecHubInstance.WorkOrderActivated({}), 1, constants.EVENT_WAIT_TIMEOUT);
    woid = events[0].args.woid;
    console.log("woid is: " + woid);
    aWorkOrderInstance = await WorkOrder.at(woid);

    //allowWorkerToContribute
    txMined = await aWorkerPoolInstance.allowWorkerToContribute(woid, resourceProvider, SGXkeys, {
      from: scheduleProvider,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
    m_statusCall = await aWorkOrderInstance.m_status.call();
    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.ACTIVE, "check m_status ACTIVE");

    //workerContribute
    assert.strictEqual(subscriptionMinimumStakePolicy, 10, "check stake sanity before contribution");
    assert.strictEqual(subscriptionLockStakePolicy, 0, "check stake sanity before contribution");
    txMined = await aIexecHubInstance.deposit(30, {
      from: resourceProvider,
      gas: constants.AMOUNT_GAS_PROVIDED
    });
    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


//# Next 5 lines represent: L1) resultHash. L2) resultSign L3) v. L4) r. L5) s.



//b3dee28119f0fc425a8637c6fd97db278761b9e3133f4d15759bf2a244f7181c
//	  adfd74a249e7b8cbce0523aee61fbc73177eee5207442d5c7dea12fd3ef515f4
//	  27
//	  56250f7ce068893a0a24afa452804a3431d66c9f734d536f56dfb04784ea22f0
//	  25e4a5c3b4ae37c749f4305f836670b95491d1d92bdb2f00020b15d4c3eb1bfb

/*
 *
 * BAD ONE
    txMined = await aWorkerPoolInstance.contribute(woid,
      '0xb3dee28119f0fc425a8637c6fd97db278761b9e3133f4d15759bf2a244f7181c',//signed.hash
      '0adfd74a249e7b8cbce0523aee61fbc73177eee5207442d5c7dea12fd3ef515f4',//signed.sign
      '27',//sgxsign_v
      '0x56250f7ce068893a0a24afa452804a3431d66c9f734d536f56dfb04784ea22f0',//sgxsign_r
      '0x25e4a5c3b4ae37c749f4305f836670b95491d1d92bdb2f00020b15d4c3eb1bfb', {//sgxsign_s
      from: resourceProvider,
      gas: constants.AMOUNT_GAS_PROVIDED
    });

*/
 /*   GOOD ONE
	      txMined = await aWorkerPoolInstance.contribute(woid,
		            '0xa55031e2361c8bdd3e222eca5eb11fb1d949b79d444e697cba6508ebea855b6e',//signed.hash
		            '0x749342a39e6367d2d4425a4bbd02188b0aee21b9b753bb9905b163e71c60fdd7',//signed.sign
		            '27',//sgxsign_v
		            '0x4e3db90707b569fbbbf9dc00a3b473e59a976fd2acff1fc022cf703f172d07ec',//sgxsign_r
		            '0x6777dcd28b761aebf533188770ef304e67472297ced7d99b0745131662b9f597', {//sgxsign_s
				          from: resourceProvider,
				          gas: constants.AMOUNT_GAS_PROVIDED
					      });
 
GOOF ONE : 
*/ 
	                txMined = await aWorkerPoolInstance.contribute(woid,
				                            '0x8839208909fb43bb4fe8a10b28685ede79a05789cd10c73e57d7ae602005d869',//signed.hash
				                            '0xbfcbe2e1c61f5ab13f7044565b82ceef25a842e2c7eca8e50bc5e8604623b360',//signed.sign
				                            '28',//sgxsign_v
				                            '0x26fa003bff36455a9866031ecd9346c105d620e8afa60eb912904666d86b675f',//sgxsign_r
				                            '0x77c4ceaa30d08a57b4b86403d32c025cde5a6f119bcba6412c15432eefc13d59', {//sgxsign_s
								                                              from: resourceProvider,
								                                              gas: constants.AMOUNT_GAS_PROVIDED
													                                                    });
 checkBalance = await aIexecHubInstance.checkBalance.call(resourceProvider);
    assert.strictEqual(checkBalance[0].toNumber(), 10, "check stake of the resourceProvider");
    assert.strictEqual(checkBalance[1].toNumber(), 30, "check stake locked of the resourceProvider : 30 + 10");

  });

/*

	  it("existing SGX NON REG TEST with hash hard coded ", async function() {

	    //Create ask Marker Order by scheduler
	    txMined = await aIexecHubInstance.deposit(100, {
	      from: scheduleProvider,
	      gas: constants.AMOUNT_GAS_PROVIDED
	    });
	    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


	    txMined = await aMarketplaceInstance.createMarketOrder(constants.MarketOrderDirectionEnum.ASK, 1  , 0  , 100  , workerPoolAddress  , 1  , {
	      from: scheduleProvider
	    });

	    //answerAskOrder
	    txMined = await aIexecHubInstance.deposit(100, {
	      from: iExecCloudUser,
	      gas: constants.AMOUNT_GAS_PROVIDED
	    });
	    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


	    txMined = await aIexecHubInstance.buyForWorkOrder(1  , aWorkerPoolInstance.address, aAppInstance.address, 0, "noParam", 0, iExecCloudUser, {
	      from: iExecCloudUser
	    });

	    events = await Extensions.getEventsPromise(aIexecHubInstance.WorkOrderActivated({}), 1, constants.EVENT_WAIT_TIMEOUT);
	    woid = events[0].args.woid;
	    console.log("woid is: " + woid);
	    aWorkOrderInstance = await WorkOrder.at(woid);

	    //allowWorkerToContribute
	    txMined = await aWorkerPoolInstance.allowWorkerToContribute(woid, resourceProvider, SGXkeys, {
	      from: scheduleProvider,
	      gas: constants.AMOUNT_GAS_PROVIDED
	    });
	    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
	    m_statusCall = await aWorkOrderInstance.m_status.call();
	    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.ACTIVE, "check m_status ACTIVE");

	    //workerContribute
	    assert.strictEqual(subscriptionMinimumStakePolicy, 10, "check stake sanity before contribution");
	    assert.strictEqual(subscriptionLockStakePolicy, 0, "check stake sanity before contribution");
	    txMined = await aIexecHubInstance.deposit(30, {
	      from: resourceProvider,
	      gas: constants.AMOUNT_GAS_PROVIDED
	    });
	    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");

	    signed = await Extensions.signResult("iExec the wanderer", resourceProvider);

			console.log("signed.hash : "+signed.hash);
			console.log("signed.sign : "+signed.sign);

	    sgxsign = web3.eth.sign(SGXkeys, signed.hash.substr(2, 64) + signed.sign.substr(2, 64));
	    sgxsign_r = '0x' + sgxsign.substr(2, 64);
			console.log("sgxsign_r : "+sgxsign_r);
	    sgxsign_s = '0x' + sgxsign.substr(66, 64);
			console.log("sgxsign_s : "+sgxsign_s);
	    sgxsign_v = web3.toDecimal(sgxsign.substr(130, 2)) + 27;
			console.log("sgxsign_v : "+sgxsign_v);


		//	signed.hash : 0x2fa3c6dc29e10dfc01cea7e9443ffe431e6564e74f5dcf4de4b04f2e5d343d70
		//	signed.sign : 0xb768f304efa403a5a41e30e0f9b82b803da12421b27ed6f32aa0b3cb33867d83
	//		sgxsign_r :   0xce03a3a3521dd274b8d27318ab6fff25a31f72d17af8ef55e176f0d805980916
	//		sgxsign_s :   0x3f784e8c4ac25b53ecc2b7a3751aa8b32012b287cfb12b49ceac9ad086d9f2ca
	//		sgxsign_v : 28


	    txMined = await aWorkerPoolInstance.contribute(woid,
				'0x2fa3c6dc29e10dfc01cea7e9443ffe431e6564e74f5dcf4de4b04f2e5d343d70',//signed.hash
				'0xb768f304efa403a5a41e30e0f9b82b803da12421b27ed6f32aa0b3cb33867d83',//signed.sign
			  '28',//sgxsign_v
				'0xce03a3a3521dd274b8d27318ab6fff25a31f72d17af8ef55e176f0d805980916',//sgxsign_r
				'0x3f784e8c4ac25b53ecc2b7a3751aa8b32012b287cfb12b49ceac9ad086d9f2ca', {//sgxsign_s
	      from: resourceProvider,
	      gas: constants.AMOUNT_GAS_PROVIDED
	    });
	    checkBalance = await aIexecHubInstance.checkBalance.call(resourceProvider);
	    assert.strictEqual(checkBalance[0].toNumber(), 10, "check stake of the resourceProvider");
	    assert.strictEqual(checkBalance[1].toNumber(), 30, "check stake locked of the resourceProvider : 30 + 10");

	    //revealConsensus
	    txMined = await aWorkerPoolInstance.revealConsensus(woid, Extensions.hashResult("iExec the wanderer"), {
	      from: scheduleProvider,
	      gas: constants.AMOUNT_GAS_PROVIDED
	    });

	    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
	    m_statusCall = await aWorkOrderInstance.m_status.call();
	    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.REVEALING, "check m_status REVEALING");

	    //revealContribution
	    const result = web3.sha3("iExec the wanderer");
			console.log("reveal result :"+result);
			//reveal result :0x5def3ac0554e7a443f84985aa9629864e81d71d59e0649ddad3d618f85a1bf4b
	    txMined = await aWorkerPoolInstance.reveal(woid, '0x5def3ac0554e7a443f84985aa9629864e81d71d59e0649ddad3d618f85a1bf4b', {
	      from: resourceProvider,
	      gas: constants.AMOUNT_GAS_PROVIDED
	    });
	    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
	    m_statusCall = await aWorkOrderInstance.m_status.call();
	    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.REVEALING, "check m_status REVEALING");




	    checkBalance = await aIexecHubInstance.checkBalance.call(scheduleProvider);
	    assert.strictEqual(checkBalance[0].toNumber(), 70, "check balance : stake");
	    assert.strictEqual(checkBalance[1].toNumber(), 30, "check balance : locked . must lock 30%");

	    txMined = await aWorkerPoolInstance.finalizeWork(woid, "aStdout", "aStderr", "anUri", {
	      from: scheduleProvider,
	      gas: constants.AMOUNT_GAS_PROVIDED
	    });
	    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");

	    events = await Extensions.getEventsPromise(aIexecHubInstance.WorkOrderCompleted({}), 1, constants.EVENT_WAIT_TIMEOUT);
	    assert.strictEqual(events[0].args.woid, woid, "woid check");
	    assert.strictEqual(events[0].args.workerPool, aWorkerPoolInstance.address, "the aWorkerPoolInstance address check");

	    m_statusCall = await aWorkOrderInstance.m_status.call();
	    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.COMPLETED, "check m_status COMPLETED");

	    results = await Promise.all([
	      aWorkOrderInstance.m_stdout.call(),
	      aWorkOrderInstance.m_stderr.call(),
	      aWorkOrderInstance.m_uri.call()
	    ]);
	    assert.strictEqual(results[0], "aStdout", "check m_stdout");
	    assert.strictEqual(results[1], "aStderr", "check m_stderr");
	    assert.strictEqual(results[2], "anUri", "check m_uri");

	    checkBalance = await aIexecHubInstance.checkBalance.call(resourceProvider);
	    assert.strictEqual(checkBalance[0].toNumber(), 139, "check stake of the resourceProvider. won 99% of price (99). (initial balance 30+10=40)");
	    assert.strictEqual(checkBalance[1].toNumber(), 0, "check stake locked of the resourceProvider: 10 form subscription lock ");

	    checkBalance = await aIexecHubInstance.checkBalance.call(scheduleProvider);
	    assert.strictEqual(checkBalance[0].toNumber(), 101, "check stake of the scheduleProvider. 100 unlocked + won 1% of price");
	    assert.strictEqual(checkBalance[1].toNumber(), 0, "check stake locked of the scheduleProvider");
	  });

*/

/*

			  it("You have a risk of 71% to have heart disease.", async function() {

			    //Create ask Marker Order by scheduler
			    txMined = await aIexecHubInstance.deposit(100, {
			      from: scheduleProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


			    txMined = await aMarketplaceInstance.createMarketOrder(constants.MarketOrderDirectionEnum.ASK, 1  , 0  , 100  , workerPoolAddress  , 1  , {
			      from: scheduleProvider
			    });

			    //answerAskOrder
			    txMined = await aIexecHubInstance.deposit(100, {
			      from: iExecCloudUser,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


			    txMined = await aIexecHubInstance.buyForWorkOrder(1 , aWorkerPoolInstance.address, aAppInstance.address, 0, "noParam", 0, iExecCloudUser, {
			      from: iExecCloudUser
			    });

			    events = await Extensions.getEventsPromise(aIexecHubInstance.WorkOrderActivated({}), 1, constants.EVENT_WAIT_TIMEOUT);
			    woid = events[0].args.woid;
			    console.log("woid is: " + woid);
			    aWorkOrderInstance = await WorkOrder.at(woid);

			    //allowWorkerToContribute
			    txMined = await aWorkerPoolInstance.allowWorkerToContribute(woid, resourceProvider, SGXkeys, {
			      from: scheduleProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
			    m_statusCall = await aWorkOrderInstance.m_status.call();
			    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.ACTIVE, "check m_status ACTIVE");

			    //workerContribute
			    assert.strictEqual(subscriptionMinimumStakePolicy, 10, "check stake sanity before contribution");
			    assert.strictEqual(subscriptionLockStakePolicy, 0, "check stake sanity before contribution");
			    txMined = await aIexecHubInstance.deposit(30, {
			      from: resourceProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");

			    signed = await Extensions.signResult("You have a risk of 71% to have heart disease.", resourceProvider);

					console.log("signed.hash : "+signed.hash);
					console.log("signed.sign : "+signed.sign);

			    sgxsign = web3.eth.sign(SGXkeys, signed.hash.substr(2, 64) + signed.sign.substr(2, 64));
			    sgxsign_r = '0x' + sgxsign.substr(2, 64);
					console.log("sgxsign_r : "+sgxsign_r);
			    sgxsign_s = '0x' + sgxsign.substr(66, 64);
					console.log("sgxsign_s : "+sgxsign_s);
			    sgxsign_v = web3.toDecimal(sgxsign.substr(130, 2)) + 27;
					console.log("sgxsign_v : "+sgxsign_v);


				//	signed.hash : 0x2fa3c6dc29e10dfc01cea7e9443ffe431e6564e74f5dcf4de4b04f2e5d343d70
				//	signed.sign : 0xb768f304efa403a5a41e30e0f9b82b803da12421b27ed6f32aa0b3cb33867d83
				//	sgxsign_r :   0xce03a3a3521dd274b8d27318ab6fff25a31f72d17af8ef55e176f0d805980916
				//	sgxsign_s :   0x3f784e8c4ac25b53ecc2b7a3751aa8b32012b287cfb12b49ceac9ad086d9f2ca
				//	sgxsign_v : 28


			    txMined = await aWorkerPoolInstance.contribute(woid,
						'0x2fa3c6dc29e10dfc01cea7e9443ffe431e6564e74f5dcf4de4b04f2e5d343d70',//signed.hash
						'0xb768f304efa403a5a41e30e0f9b82b803da12421b27ed6f32aa0b3cb33867d83',//signed.sign
						'28',//sgxsign_v
						'0xce03a3a3521dd274b8d27318ab6fff25a31f72d17af8ef55e176f0d805980916',//sgxsign_r
						'0x3f784e8c4ac25b53ecc2b7a3751aa8b32012b287cfb12b49ceac9ad086d9f2ca', {//sgxsign_s
			      from: resourceProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    checkBalance = await aIexecHubInstance.checkBalance.call(resourceProvider);
			    assert.strictEqual(checkBalance[0].toNumber(), 10, "check stake of the resourceProvider");
			    assert.strictEqual(checkBalance[1].toNumber(), 30, "check stake locked of the resourceProvider : 30 + 10");

			    //revealConsensus
			    txMined = await aWorkerPoolInstance.revealConsensus(woid, Extensions.hashResult("iExec the wanderer"), {
			      from: scheduleProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });

			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
			    m_statusCall = await aWorkOrderInstance.m_status.call();
			    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.REVEALING, "check m_status REVEALING");

			    //revealContribution
			    const result = web3.sha3("iExec the wanderer");
					console.log("reveal result :"+result);
					//reveal result :0x5def3ac0554e7a443f84985aa9629864e81d71d59e0649ddad3d618f85a1bf4b
			    txMined = await aWorkerPoolInstance.reveal(woid, '0x5def3ac0554e7a443f84985aa9629864e81d71d59e0649ddad3d618f85a1bf4b', {
			      from: resourceProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
			    m_statusCall = await aWorkOrderInstance.m_status.call();
			    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.REVEALING, "check m_status REVEALING");




			    checkBalance = await aIexecHubInstance.checkBalance.call(scheduleProvider);
			    assert.strictEqual(checkBalance[0].toNumber(), 70, "check balance : stake");
			    assert.strictEqual(checkBalance[1].toNumber(), 30, "check balance : locked . must lock 30%");

			    txMined = await aWorkerPoolInstance.finalizeWork(woid, "aStdout", "aStderr", "anUri", {
			      from: scheduleProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");

			    events = await Extensions.getEventsPromise(aIexecHubInstance.WorkOrderCompleted({}), 1, constants.EVENT_WAIT_TIMEOUT);
			    assert.strictEqual(events[0].args.woid, woid, "woid check");
			    assert.strictEqual(events[0].args.workerPool, aWorkerPoolInstance.address, "the aWorkerPoolInstance address check");

			    m_statusCall = await aWorkOrderInstance.m_status.call();
			    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.COMPLETED, "check m_status COMPLETED");

			    results = await Promise.all([
			      aWorkOrderInstance.m_stdout.call(),
			      aWorkOrderInstance.m_stderr.call(),
			      aWorkOrderInstance.m_uri.call()
			    ]);
			    assert.strictEqual(results[0], "aStdout", "check m_stdout");
			    assert.strictEqual(results[1], "aStderr", "check m_stderr");
			    assert.strictEqual(results[2], "anUri", "check m_uri");

			    checkBalance = await aIexecHubInstance.checkBalance.call(resourceProvider);
			    assert.strictEqual(checkBalance[0].toNumber(), 139, "check stake of the resourceProvider. won 99% of price (99). (initial balance 30+10=40)");
			    assert.strictEqual(checkBalance[1].toNumber(), 0, "check stake locked of the resourceProvider: 10 form subscription lock ");

			    checkBalance = await aIexecHubInstance.checkBalance.call(scheduleProvider);
			    assert.strictEqual(checkBalance[0].toNumber(), 101, "check stake of the scheduleProvider. 100 unlocked + won 1% of price");
			    assert.strictEqual(checkBalance[1].toNumber(), 0, "check stake locked of the scheduleProvider");
			  });

*/

/*

			  it("DATA FROM LEI signed.hash signed.sign => OK", async function() {

			    //Create ask Marker Order by scheduler
			    txMined = await aIexecHubInstance.deposit(100, {
			      from: scheduleProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


			    txMined = await aMarketplaceInstance.createMarketOrder(constants.MarketOrderDirectionEnum.ASK, 1 , 0  , 100  , workerPoolAddress , 1 , {
			      from: scheduleProvider
			    });

			    //answerAskOrder
			    txMined = await aIexecHubInstance.deposit(100, {
			      from: iExecCloudUser,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


			    txMined = await aIexecHubInstance.buyForWorkOrder(1  , aWorkerPoolInstance.address, aAppInstance.address, 0, "noParam", 0, iExecCloudUser, {
			      from: iExecCloudUser
			    });

			    events = await Extensions.getEventsPromise(aIexecHubInstance.WorkOrderActivated({}), 1, constants.EVENT_WAIT_TIMEOUT);
			    woid = events[0].args.woid;
			    console.log("woid is: " + woid);
			    aWorkOrderInstance = await WorkOrder.at(woid);

			    //allowWorkerToContribute
			    txMined = await aWorkerPoolInstance.allowWorkerToContribute(woid, resourceProvider, SGXkeys, {
			      from: scheduleProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
			    m_statusCall = await aWorkOrderInstance.m_status.call();
			    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.ACTIVE, "check m_status ACTIVE");

			    //workerContribute
			    assert.strictEqual(subscriptionMinimumStakePolicy, 10, "check stake sanity before contribution");
			    assert.strictEqual(subscriptionLockStakePolicy, 0, "check stake sanity before contribution");
			    txMined = await aIexecHubInstance.deposit(30, {
			      from: resourceProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


//# Next 5 lines represent: L1) resultHash. L2) resultSign L3) v. L4) r. L5) s.
//8839208909fb43bb4fe8a10b28685ede79a05789cd10c73e57d7ae602005d869
//bfcbe2e1c61f5ab13f7044565b82ceef25a842e2c7eca8e50bc5e8604623b360
//28
//26fa003bff36455a9866031ecd9346c105d620e8afa60eb912904666d86b675f
//77c4ceaa30d08a57b4b86403d32c025cde5a6f119bcba6412c15432eefc13d59


			    txMined = await aWorkerPoolInstance.contribute(woid,
						'0x8839208909fb43bb4fe8a10b28685ede79a05789cd10c73e57d7ae602005d869',//signed.hash
						'0xbfcbe2e1c61f5ab13f7044565b82ceef25a842e2c7eca8e50bc5e8604623b360',//signed.sign
						'28',//sgxsign_v
						'0x26fa003bff36455a9866031ecd9346c105d620e8afa60eb912904666d86b675f',//sgxsign_r
						'0x77c4ceaa30d08a57b4b86403d32c025cde5a6f119bcba6412c15432eefc13d59', {//sgxsign_s
			      from: resourceProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    checkBalance = await aIexecHubInstance.checkBalance.call(resourceProvider);
			    assert.strictEqual(checkBalance[0].toNumber(), 10, "check stake of the resourceProvider");
			    assert.strictEqual(checkBalance[1].toNumber(), 30, "check stake locked of the resourceProvider : 30 + 10");

			  });


				it("DATA FROM XTREMWEB signed.hash signed.sign =>  KO", async function() {

			    //Create ask Marker Order by scheduler
			    txMined = await aIexecHubInstance.deposit(100, {
			      from: scheduleProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


			    txMined = await aMarketplaceInstance.createMarketOrder(constants.MarketOrderDirectionEnum.ASK, 1 , 0  , 100  , workerPoolAddress  , 1  , {
			      from: scheduleProvider
			    });

			    //answerAskOrder
			    txMined = await aIexecHubInstance.deposit(100, {
			      from: iExecCloudUser,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");


			    txMined = await aIexecHubInstance.buyForWorkOrder(1  , aWorkerPoolInstance.address, aAppInstance.address, 0, "noParam", 0, iExecCloudUser, {
			      from: iExecCloudUser
			    });

			    events = await Extensions.getEventsPromise(aIexecHubInstance.WorkOrderActivated({}), 1, constants.EVENT_WAIT_TIMEOUT);
			    woid = events[0].args.woid;
			    console.log("woid is: " + woid);
			    aWorkOrderInstance = await WorkOrder.at(woid);

			    //allowWorkerToContribute
			    txMined = await aWorkerPoolInstance.allowWorkerToContribute(woid, resourceProvider, SGXkeys, {
			      from: scheduleProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");
			    m_statusCall = await aWorkOrderInstance.m_status.call();
			    assert.strictEqual(m_statusCall.toNumber(), constants.WorkOrderStatusEnum.ACTIVE, "check m_status ACTIVE");

			    //workerContribute
			    assert.strictEqual(subscriptionMinimumStakePolicy, 10, "check stake sanity before contribution");
			    assert.strictEqual(subscriptionLockStakePolicy, 0, "check stake sanity before contribution");
			    txMined = await aIexecHubInstance.deposit(30, {
			      from: resourceProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    assert.isBelow(txMined.receipt.gasUsed, constants.AMOUNT_GAS_PROVIDED, "should not use all gas");



//hashResult:0xd2b9b2bfd7321d007003572f1536fb98f63f7f209b0068faa5d85bfb5fd834d3,
//signResult:0x51e503cbc1293c502347bb7f662c63abcdfa022304948d9ec0a120a3ecc7a30d,

//ThreadWork#zipResult : SGXEnclave - v=28, r=26fa003bff36455a9866031ecd9346c105d620e8afa60eb912904666d86b675f, s=77c4ceaa30d08a57b4b86403d32c025cde5a6f119bcba6412c15432eefc13d59


			    txMined = await aWorkerPoolInstance.contribute(woid,
						'0xd2b9b2bfd7321d007003572f1536fb98f63f7f209b0068faa5d85bfb5fd834d3',//signed.hash
						 '0x51e503cbc1293c502347bb7f662c63abcdfa022304948d9ec0a120a3ecc7a30d',//signed.sign
						  '28',//sgxsign_v
						'0x26fa003bff36455a9866031ecd9346c105d620e8afa60eb912904666d86b675f',//sgxsign_r
						'0x77c4ceaa30d08a57b4b86403d32c025cde5a6f119bcba6412c15432eefc13d59', {//sgxsign_s
			      from: resourceProvider,
			      gas: constants.AMOUNT_GAS_PROVIDED
			    });
			    checkBalance = await aIexecHubInstance.checkBalance.call(resourceProvider);
			    assert.strictEqual(checkBalance[0].toNumber(), 10, "check stake of the resourceProvider");
			    assert.strictEqual(checkBalance[1].toNumber(), 30, "check stake locked of the resourceProvider : 30 + 10");

			  });
*/




});
