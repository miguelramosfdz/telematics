//Open the tabgroup
$.index.open();

var logFile = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'driving_log.txt');
var crypto = require("crypto");
crypto.init("KEYSIZE_AES128");
var navi = require('ti.navibridge');
navi.setApplicationId('ICiAV4Ay');


//DEVICE TESTING: Comment to build to device
if(OS_IOS){
	vehicleModule = require('jp.co.denso.vehiclemodule');
} else {
	$.connectBtn.hide();
	$.connectBtn = null;
}

//Require ACS module
var	acs = require('acs'),

//Create the vehicleObject
vehicleObject=null,

//Create a blank report string variable to store the driving report
report = '',
simulationArr = [],
simulationInt = null,

//Create the 'track' object to define the properties to be tracked
track = {
	throttlePosition:{
		flag:false,
		max:0,
		current:0
	},
	vehicleSpeed:{
		flag:false,
		max:0,
		current:0
	},
	accelerationX:{
		flag:false,
		max:0,
		current:0
	},
	engineSpeed:{
		flag:false,
		max:0,
		current:0
	},
	engineTemp:{
		flag:false,
		max:0,
		current:0
	},
	outsideTemp:{
		flag:false,
		max:0,
		current:0
	},
	transmission:{
		flag:false,
		status:null
	},
	trip:{
		start:null,
		end:null
	},
	temp:{
		flag:false,
		min:null,
		max:null
	},
	light:{
		flag:false
	},
	location:{
		flag:false,
		lat:null,
		lon:null
	}
},

//Create the 'settings' object to define the default user settings
settings = {
	driverName: "Telematics Demo",
	reportEmail: "aleard@appcelerator.com",
	throttlePosition:{
		max:75,
		notify:true,
		extension:"%"
	},
	vehicleSpeed:{
		max:105,
		notify:true,
		extension:" mph",
		conversion: true
	},
	accelerationX:{
		max:10,
		notify:true,
		extension:" g-force",
		conversion: true
		
	},
	engineSpeed:{
		max:8000,
		notify:true,
		extension:" rpm",
		conversion: true
	},
	engineTemp:{
		max:80,
		notify:true,
		extension:" celsius",
		conversion: false
	},
	outsideTemp:{
		max:3,
		notify:true,
		extension:" celsius",
		conversion: false
	},
	latitude:{
		max:null,
		min:null,
		notify:true
	},
	longitude:{
		max:null,
		min:null,
		notify:true
	}
},

//Create conversion functions for speed (kph/mph) and acceleration/g-force
conversion = {
	vehicleSpeed: function(e){
		if(e.type == "out"){
			return Math.round(parseFloat(e.value)*0.621371);
		} else {
			return Math.round(parseFloat(e.value)*1.60934);
		}
	},
	accelerationX: function(e){
		if(e.type == "out"){
			
			return ((parseFloat(e.value))/9.8).toFixed(2);
		} else {
			return (parseFloat(e.value)*9.8);
		}
	},
	engineSpeed: function(e) {  
        return e.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
   	},
    engineTemp:function(e) {
    	return e.value*1.8;
    }
    
};

//Check if a UUID has been assigned and login or create a login
if(Ti.App.Properties.hasProperty('UUID')){
        acs.userLogin({success:loggedIn});
} else{
        Ti.App.Properties.setString('UUID', Ti.Platform.createUUID());
        acs.userCreate({success:loggedIn});
}

//populate the settings fields
populateSettings();

//Get a list of devices that can be connected from application
$.drivingHeader && $.drivingHeader.setTitle("Telematics Drive");
$.settingsHeader && $.settingsHeader.setTitle("Drive Settings");
$.naviHeader && $.naviHeader.setTitle("Navi Demo");

var data = [
	{
		lat: 37.389569,
		lon: -122.050212,
		title: 'Appcelerator',
		image:"http://media.tumblr.com/tumblr_m1hzbmMNrs1qznie6.jpg"
	},
	{
		lat: 37.331689,
		lon: -122.030731,
		title: 'Apple',
		image:"http://www.bangor.ac.uk/itservices/office365/images/apple.png"
	},
	{
		lat: 37.422502,
		lon: -122.0855498,
		title: 'Google',
		image:"https://cdn1.iconfinder.com/data/icons/yooicons_set01_socialbookmarks/512/social_google_box.png"
	}
];

for(var i in data){
	var row = Alloy.createController("row", data[i]).getView();
	$.locations.add(row);
}
$.locations.add(Alloy.createController("row", {title:"All Locations", image:"/navIcon.png"}).getView());


function naviClick(row){
	var args = row.source;
	navi.Enabled = true;
	if(args.lat){
		navi.addPOI({ 
			lat:args.lat, 
			lon:args.lon, 
			title:args.title, 
			callbackURL:"com.appcelerator.telematics://",
		 	text: args.title+" added successfully"
		});
	} else {
		navi.addMultiPOI({
			poi:data,
			callbackURL: "com.appcelerator.telematics://",
		 	text: "All locations added successfully"
		});
	}
}

//Populate the settings textfields
function populateSettings(data){
	if(data!=null){
		settings = data;
	}
	$.driverName.value = settings.driverName;
	$.reportEmail.value = settings.reportEmail;
	$.vehicleSpeedMax.value = conversion['vehicleSpeed']({type:"out", value:settings.vehicleSpeed.max})+settings.vehicleSpeed.extension;
	$.engineSpeedMax.value = settings.engineSpeed.max+settings.engineSpeed.extension;
	$.accelerationXMax.value = conversion['accelerationX']({type:"out",value:settings.accelerationX.max})+settings.accelerationX.extension;
	$.throttlePositionMax.value = settings.throttlePosition.max+settings.throttlePosition.extension;
}

//Connect to denso vehicle simulator
function vehicleConnect(){
	// Search for available vehicles
	vehicleModule.startSearchDevice(deviceSearch);
	
	//Update button status
	$.connectBtn.title = 'waiting for vehicle...';
};

//Search for an available device and connect
function deviceSearch(device){

	// Stop vehicle search
	vehicleModule.stopSearchDevice();
	
	// Log vehicle ID
	Ti.API.info(device.id);
	
  	// Set vehicle object
	vehicleObject = vehicleModule.createVehicleInterface({
		device: device
	});
	
	// Adds an event listener for get connection status
	vehicleObject.addEventListener('connectionStatus', connect);
	
	// Connecting to the device and authenticating the application
	vehicleObject.connect();
	
	
};

//Check connection status and either started connected activity or disconnect
function connect(e){
	
	// Log successful connection	
	Ti.API.info("status=" + e.status);
	
	if(e.status == 'connected'){
		$.simulateBtn.hide();
		// Set button and label
		$.connectBtn.title = 'Disconnect from Vehicle';
		$.status.text = 'Put vehicle in gear to start...';
		appAlert("Connected to Vehicle Simulator");
		// Start listening for driving operation changes
		vehicleObject && vehicleObject.addEventListener('drivingOperation', didReceiveDrivingOperation );
		
		// Change connect button event listeners
		$.connectBtn.removeEventListener('click', vehicleConnect);
		$.connectBtn.addEventListener('click', disconnect);
	} else {
		
		//Disconnect from device
		disconnect(e);
	}
};

//Disconnect from the device and prepare to reconnect		
function disconnect(e) {
	appAlert("disconnected from Vehicle Simulator");
	if(report != null){
		var endTime = new Date().toLocaleString();
		track.trip.end = endTime;
		finalizeReport(endTime);
	}
	// Update button title
	$.simulateBtn.show();
	$.connectBtn.title = 'Connect to Vehicle';
	$.status.text = 'Connect to start tracking';
	// Remove an event listener
	if(vehicleObject!=null){
		vehicleObject.removeEventListener('drivingOperation', didReceiveDrivingOperation );
		
		// Disconnect from the device
		vehicleObject.disconnect();
		
		// Null vehicle onject
		vehicleObject = null;
	}
	
	// Change connect button event listeners
	$.connectBtn.removeEventListener('click', disconnect);
	$.connectBtn.addEventListener('click', vehicleConnect);
};

//Receive vehicle behavior and act on it
function didReceiveVehicleBehavior(e)
{
	//Track the current data points
	vehicleBehaviorTrack({label:$.maxSpeed, type:'vehicleSpeed', title:"Vehicle Speed", data:e.vehicleSpeed});
	vehicleBehaviorTrack({label:$.maxThrottle, type:'throttlePosition', title:"Throttle Rate", data: e.throttlePosition});
	vehicleBehaviorTrack({label:$.maxRpm, type:'engineSpeed', title:"Engine Speed", data: e.engineSpeed});
	vehicleBehaviorTrack({label:$.maxAcceleration, type:'accelerationX', title:"Acceleration", data: e.accelerationX});
	
	// e.latitude
	// e.longitude
	// e.fuelConsumption
};

//Check rules then report & notify accordingly
function vehicleBehaviorTrack(e){
	var vData = e.data;
	var settingMax = settings[e.type] && settings[e.type].max?settings[e.type].max:null;
	var currentMax = track[e.type].current;
	//If there is a conversion necessary, do it
	if(settings[e.type].conversion && settingMax){
		vData = conversion[e.type]({type:"out",value:e.data});
		settingMax = conversion[e.type]({type:"out", value: settings[e.type].max});
		//currentMax = conversion[e.type]({type:"out", value: track[e.type].current});
	}
	
	//If the data is greater then the current max, record it
	if(vData>track[e.type].max || track[e.type].max == 0){
		track[e.type].max = vData;
	}
	e.label.text = e.title+": "+vData+settings[e.type].extension;
	
	//If the data is greater then the current user setting limit, notify & report
	if(vData>settingMax){

		if(!track[e.type].flag){
			track[e.type].flag = true;
			if(settings[e.type].notify){
				if(Titanium.Platform.model != 'Simulator' && OS_IOS){
					acs.pushNotify({payload:"Drive Track Alert for "+settings.driverName+"\n\n"+e.title+" exceeded limit of "+settingMax+settings[e.type].extension});
				} else {
					appAlert("Exceeded limit of "+settingMax+settings[e.type].extension);
				}
			}
			
		} else {
			if(!track[e.type].current || vData>track[e.type].current){
				track[e.type].current = vData;
			}
		}
		
	}
	
	//If the data is below the limit, turn the tracking flag off and append the report of the incident
	if(vData<settingMax){
		if(track[e.type].flag){
			track[e.type].flag = false;
			if(currentMax!=null || currentMax!=undefined){
				//appendReport({title:e.title+" Limit Exceeded", detail:currentMax+settings[e.type].extension});
			}
			track[e.type].current = null;
		} 
		
	}
}

//Receive initial driving behavior (changing out of Park starts the reporting)
function didReceiveDrivingOperation(e)
{	
	
	//When transmission is moved from park, start tracking
	if(e.transmissionRange != 0 && !track.transmission.flag){
		
		if(e.parkingBrakeStatus==1){
			appAlert('WARNING: Your parking break is still on.');
		};
		
		//Check if there are settings stored in the cloud and update the local settings
		getCloud();
		
		//Add vehicle event listeners
		if(vehicleObject){
			vehicleObject.addEventListener('vehicleBehavior', didReceiveVehicleBehavior );
			vehicleObject.addEventListener('vehicleStatus', didReceiveVehicleStatus );
		}
		//Set tracking flag to true
		track.transmission.flag = true;
		
		//Create a report string and set the start time
		var startTime = new Date().toLocaleString();
		track.trip.start = startTime;
		createReport(startTime);
		
		//Update the status text
		$.status.text = 'Put vehicle in park to stop tracking...';
		appAlert('Start: '+track.trip.start);
	
	} else if(e.transmissionRange == 0 && track.transmission.flag){
			var loading = Ti.UI.createActivityIndicator({
				message:"Generating Driving Report...",
				backgroundColor:"#000",
				opacity:0.8,
				top:60,
				height:Ti.UI.FILL,
				width:Ti.UI.FILL,
				color:"#fff"
			});
			
			$.drivingWin.add(loading);
			loading.show();
			
			var endTime = new Date().toLocaleString();
			track.trip.end = endTime;
			finalizeReport(endTime);
			appAlert('End: '+track.trip.end);
			
			//Stop tracking and finalize 
			if(vehicleObject){
				vehicleObject.removeEventListener('vehicleBehavior', didReceiveVehicleBehavior );
				vehicleObject.removeEventListener('vehicleStatus', didReceiveVehicleStatus );
			}
			track.transmission.flag = false;
			appAlert('Finalizing Report');
			//Finalize and send report via email
			
			
			//Encrypt Log File
			appAlert('Encrypting and compressing log file');
			loading.message = "Encrypting Driving Data...";
			var encryptedLogData = crypto.encrypt({source:logFile.read(), type:"TYPE_BLOB"});
			var encryptedLogFile = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'encryptedFile.txt');
			encryptedLogFile.write(encryptedLogData.toBlob());
			
			//Compress Log File
			var Compression = require('ti.compression');
	        var writeToZip = Ti.Filesystem.applicationDataDirectory + '/logfile.zip';
	        loading.message = "Compressing Encrypted File...";
	        Compression.zip(writeToZip, [encryptedLogFile.resolve()]);
	       
	        //Send log file
			acs.emailSend({loading:loading, window:$.drivingWin, message:report, recipients:settings.reportEmail, name: settings.driverName, attachment:'logfile.zip'});
			
			//Update status label and alert user
			$.status.text = 'Put vehicle in gear to start...';
	}
	
	//Track the transmission status
	track.transmission.status = e.transmissionRange;
};

function didReceiveVehicleStatus(e){
 	$.engineTemp.text = "Engine Water Temp: "+e.engineWaterTemperature+settings.engineTemp.extension;
 	$.outsideTemp.text = "Outside Temp: "+e.outsideTemperature+settings.outsideTemp.extension;
	var d = new Date();
	var n = d.getHours();
	if(n>16 && !track.light.flag){
		if(e.frontLightStatus=='off'){
			appAlert('WARNING: Headlights are currently '+e.frontLightStatus);
			track.light.flag = true;
		}
	}
	if(e.engineWaterTemperature>80){
		appAlert('Car overheating! Water Temp at '+e.engineWaterTemperature+' celsius.');
	}
	//vehicleBehaviorTrack({label:$.engineTemp, type:"engineTemp", title:"Engine Water Temp", data: e.engineWaterTemperature});
	//vehicleBehaviorTrack({label:$.outsideTemp, type:"outsideTemp", title:"Outside Temp", data: e.outsideTemperature});
	
	if(e.outsideTemperature<=3 && !track.temp.flag) {
		//track.temp.flag = true;
		appAlert('Be careful, its cold '+e.outsideTemperature+" celsius");
	} else if(e.outsideTemperature>3 && track.temp.flag){
		track.temp.flag = false;
	}
	if(track.temp.min == null){
		track.temp.min = e.outsideTemperature;
	}
	if(track.temp.max == null){
		track.temp.min = e.outsideTemperature;
	}
	if(e.outsideTemperature>track.temp.max){
		track.temp.max = e.outsideTemperature;
	}
	if(e.outsideTemperature<track.temp.min){
		track.temp.min = e.outsideTemperature;
	}
};


//Start auto simulation
function startSimulation(){
	if(simulationInt == null){
		var startTime = new Date().toLocaleString();
		track.trip.start = startTime;
		createReport(startTime);
		appAlert('Start: '+track.trip.start);
		simulationArr = [];
		$.status.text = "Tracking Simulation";
		$.simulateBtn.title = "Stop Simulation";
		$.connectBtn && $.connectBtn.hide();
		track.transmission.flag =true;
		simulate();
		simulationInt = setInterval(simulate, 2000);
	} else {
		
		simulate(true);
		clearInterval(simulationInt);
		simulationInt = null;
		
		$.simulateBtn.title = "Start Auto Simulation";
		if(OS_IOS && Titanium.Platform.model == 'Simulator'){
			$.connectBtn && $.connectBtn.show();
		}
	}
}

function random(e){
	return Math.floor(Math.random()*e);
}

function simulate(end){
	var speed = random(120);
	var temp = random(100);
	didReceiveVehicleBehavior({
		vehicleSpeed:speed,
		throttlePosition:random(100),
		engineSpeed:random(9000),
		accelerationX:random(15)
	});

	didReceiveVehicleStatus({
		frontLightStatus:'on',
		engineWaterTemperature:temp,
		outsideTemperature:random(10)
	});
	
	didReceiveDrivingOperation({
		parkingBrakeStatus:0,
		transmissionRange:end?0:1
	});
	
	var dataBody = {
		"CustomerID":10,
        "VehicleId":15,
        "OdometerRead": 2013,
        "Location": "test location",
        "Speed": speed,
        "Elevation": "1035 ft",
        "Temperature": temp,
        "FuelLevel": 75,
        "BatteryLevel": 85,
        "DiagnosisCode": 15234
	};
	simulationArr.push(dataBody);
	
}

//Update settings on textField CHANGE
function updateSettings(e){
	if(e.source.type != "driverName" && e.source.type != "reportEmail" ){
		if(e.source.value.length>0){
			
			if(settings[e.source.type].conversion){
				settings[e.source.type].max = conversion[e.source.type]({type:"in", value:e.source.value});
			} else {
				settings[e.source.type].max = e.source.value;
			}
	
		}
	} else {
		settings[e.source.type] = e.source.value;
	}
	
}

//Insert extension title at the end of the textField and update Cloud on BLUR
function addExtension(e){
	if(e.source.value){
		e.source.value += settings[e.source.type].extension;
	} else {
		if(settings[e.source.type].conversion){
				e.source.value = conversion[e.source.type]({type:"out", value:settings[e.source.type].max})+settings[e.source.type].extension;
			} else {
				e.source.value = settings[e.source.type].max+settings[e.source.type].extension;
			}
	}
	//
	updateCloud();
}

//Update the ACS custom object to maintain state across devices
function updateCloud(){
	if(Ti.App.Properties.hasProperty('pushID')){
		if(Ti.App.Properties.hasProperty('userLink')){
			acs.updateUserLink(settings, populateSettings);
		} else {
			acs.createUserLink(settings);
		}
	}
}

//Get settings from the cloud
function getCloud(){
	if(Ti.App.Properties.hasProperty('userLink')){
			acs.getUserLink(function(e){
				populateSettings(e);
			});
	}
}

//Action on Logging in (Register/Subscribe for Push and get cloud data)
function loggedIn(){
	//Register for push notification and subscribe to default channel on success
	if(!Ti.App.Properties.hasProperty('deviceToken')){
		acs.pushRegister();
		getCloud();
	}
}

//Start the report string
function createReport(startTime){
	report = "<p><b>Drive Track Driving Report Details for "+settings.driverName+"</b><br><br>Start Time: "+startTime+"</p><p>";
}

//Apend the report as statuses come in
function appendReport(data){
	var date = new Date();
	var hour = date.getHours();
	var minutes = (date.getMinutes()<10?'0':'') + date.getMinutes();
	var time = hour+":"+minutes;
	report += data.title+": "+data.detail+ " (Time: " +time+")<br>";
}

//Finalize the email report and rest maximums
function finalizeReport(endTime){
	report += "</p><p>End Time: "+endTime+"<br><br>Max Speed: "+track.vehicleSpeed.max+settings.vehicleSpeed.extension+"<br>Max RPMs: "+track.engineSpeed.max+settings.engineSpeed.extension+"<br>Max Acceleration: "+track.accelerationX.max+settings.accelerationX.extension+"<br>Max Throttle: "+track.throttlePosition.max+settings.throttlePosition.extension+"<br></p>";
	track.vehicleSpeed.max = 0;
	track.engineSpeed.max = 0;
	track.accelerationX.max = 0;
	track.throttlePosition.max = 0;
	
};

//Display parent setting textFields and get latest cloud settings
function showParent(){
	getCloud();
	$.reportLabel.show();
	$.reportEmail.show();
	$.vehicleSpeedMax.show();
	$.engineSpeedMax.show();
	$.accelerationXMax.show();
	$.throttlePositionMax.show();
	$.engineTemp.show();
	$.outsideTemp.show();
}

function windowFocus(evt){
	showParent();
	if(evt.source.id == "naviWin"){
		if(!Titanium.Platform.canOpenURL('navicon://')){
			navi.installNavi(); 
		}
	}	
}

function appAlert(message){
	//Output log info
	var current = $.alertLabel.text || "";
	$.alertLabel.show();
	var log = "[INFO]: "+message+"\n";
	$.alertLabel.text = log+current;
	
	//Wrtie log info to file
	var writeLog = OS_IOS?crypto.encrypt({source:log, type:"TYPE_HEXSTRING"}):log;
	
	if(current == ""){
		logFile.write(writeLog,false);
	} else {
		logFile.write(writeLog,true);
	}
}

if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad')
{
  var touchTestModule = undefined;
  try
  {
    touchTestModule = require("com.soasta.touchtest");
  }
  catch (tt_exception)
  {
    Ti.API.error("com.soasta.touchest module is required");
  }

  var cloudTestURL = Ti.App.getArguments().url;
  if (cloudTestURL != null)
  {
    // The URL will be null if we don't launch through TouchTest.
    touchTestModule && touchTestModule.initTouchTest(cloudTestURL);
  }

  Ti.App.addEventListener('resumed',function(e)
  {
    // Hook the resumed from background
    var cloudTestURL = Ti.App.getArguments().url;
    if (cloudTestURL != null)
    {
      touchTestModule && touchTestModule.initTouchTest(cloudTestURL);
    }
  });
}