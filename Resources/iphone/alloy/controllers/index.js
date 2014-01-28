function Controller() {
    function naviClick(row) {
        var args = row.source;
        navi.Enabled = true;
        args.lat ? navi.addPOI({
            lat: args.lat,
            lon: args.lon,
            title: args.title,
            callbackURL: "com.appcelerator.telematics://",
            text: args.title + " added successfully"
        }) : navi.addMultiPOI({
            poi: data,
            callbackURL: "com.appcelerator.telematics://",
            text: "All locations added successfully"
        });
    }
    function populateSettings(data) {
        null != data && (settings = data);
        $.driverName.value = settings.driverName;
        $.reportEmail.value = settings.reportEmail;
        $.vehicleSpeedMax.value = conversion["vehicleSpeed"]({
            type: "out",
            value: settings.vehicleSpeed.max
        }) + settings.vehicleSpeed.extension;
        $.engineSpeedMax.value = settings.engineSpeed.max + settings.engineSpeed.extension;
        $.accelerationXMax.value = conversion["accelerationX"]({
            type: "out",
            value: settings.accelerationX.max
        }) + settings.accelerationX.extension;
        $.throttlePositionMax.value = settings.throttlePosition.max + settings.throttlePosition.extension;
    }
    function vehicleConnect() {
        vehicleModule.startSearchDevice(deviceSearch);
        $.connectBtn.title = "waiting for vehicle...";
    }
    function deviceSearch(device) {
        vehicleModule.stopSearchDevice();
        Ti.API.info(device.id);
        vehicleObject = vehicleModule.createVehicleInterface({
            device: device
        });
        vehicleObject.addEventListener("connectionStatus", connect);
        vehicleObject.connect();
    }
    function connect(e) {
        Ti.API.info("status=" + e.status);
        if ("connected" == e.status) {
            $.simulateBtn.hide();
            $.connectBtn.title = "Disconnect from Vehicle";
            $.status.text = "Put vehicle in gear to start...";
            appAlert("Connected to Vehicle Simulator");
            vehicleObject && vehicleObject.addEventListener("drivingOperation", didReceiveDrivingOperation);
            $.connectBtn.removeEventListener("click", vehicleConnect);
            $.connectBtn.addEventListener("click", disconnect);
        } else disconnect(e);
    }
    function disconnect() {
        appAlert("disconnected from Vehicle Simulator");
        if (null != report) {
            var endTime = new Date().toLocaleString();
            track.trip.end = endTime;
            finalizeReport(endTime);
        }
        $.simulateBtn.show();
        $.connectBtn.title = "Connect to Vehicle";
        $.status.text = "Connect to start tracking";
        if (null != vehicleObject) {
            vehicleObject.removeEventListener("drivingOperation", didReceiveDrivingOperation);
            vehicleObject.disconnect();
            vehicleObject = null;
        }
        $.connectBtn.removeEventListener("click", disconnect);
        $.connectBtn.addEventListener("click", vehicleConnect);
    }
    function didReceiveVehicleBehavior(e) {
        vehicleBehaviorTrack({
            label: $.maxSpeed,
            type: "vehicleSpeed",
            title: "Vehicle Speed",
            data: e.vehicleSpeed
        });
        vehicleBehaviorTrack({
            label: $.maxThrottle,
            type: "throttlePosition",
            title: "Throttle Rate",
            data: e.throttlePosition
        });
        vehicleBehaviorTrack({
            label: $.maxRpm,
            type: "engineSpeed",
            title: "Engine Speed",
            data: e.engineSpeed
        });
        vehicleBehaviorTrack({
            label: $.maxAcceleration,
            type: "accelerationX",
            title: "Acceleration",
            data: e.accelerationX
        });
    }
    function vehicleBehaviorTrack(e) {
        var vData = e.data;
        var settingMax = settings[e.type] && settings[e.type].max ? settings[e.type].max : null;
        var currentMax = track[e.type].current;
        if (settings[e.type].conversion && settingMax) {
            vData = conversion[e.type]({
                type: "out",
                value: e.data
            });
            settingMax = conversion[e.type]({
                type: "out",
                value: settings[e.type].max
            });
        }
        (vData > track[e.type].max || 0 == track[e.type].max) && (track[e.type].max = vData);
        e.label.text = e.title + ": " + vData + settings[e.type].extension;
        if (vData > settingMax) if (track[e.type].flag) (!track[e.type].current || vData > track[e.type].current) && (track[e.type].current = vData); else {
            track[e.type].flag = true;
            settings[e.type].notify && ("Simulator" != Titanium.Platform.model && true ? acs.pushNotify({
                payload: "Drive Track Alert for " + settings.driverName + "\n\n" + e.title + " exceeded limit of " + settingMax + settings[e.type].extension
            }) : appAlert("Exceeded limit of " + settingMax + settings[e.type].extension));
        }
        if (settingMax > vData && track[e.type].flag) {
            track[e.type].flag = false;
            null != currentMax || void 0 != currentMax;
            track[e.type].current = null;
        }
    }
    function didReceiveDrivingOperation(e) {
        if (0 == e.transmissionRange || track.transmission.flag) {
            if (0 == e.transmissionRange && track.transmission.flag) {
                var loading = Ti.UI.createActivityIndicator({
                    message: "Generating Driving Report...",
                    backgroundColor: "#000",
                    opacity: .8,
                    top: 60,
                    height: Ti.UI.FILL,
                    width: Ti.UI.FILL,
                    color: "#fff"
                });
                $.drivingWin.add(loading);
                loading.show();
                var endTime = new Date().toLocaleString();
                track.trip.end = endTime;
                finalizeReport(endTime);
                appAlert("End: " + track.trip.end);
                if (vehicleObject) {
                    vehicleObject.removeEventListener("vehicleBehavior", didReceiveVehicleBehavior);
                    vehicleObject.removeEventListener("vehicleStatus", didReceiveVehicleStatus);
                }
                track.transmission.flag = false;
                appAlert("Finalizing Report");
                appAlert("Encrypting and compressing log file");
                loading.message = "Encrypting Driving Data...";
                var encryptedLogData = crypto.encrypt({
                    source: logFile.read(),
                    type: "TYPE_BLOB"
                });
                var encryptedLogFile = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, "encryptedFile.txt");
                encryptedLogFile.write(encryptedLogData.toBlob());
                var Compression = require("ti.compression");
                var writeToZip = Ti.Filesystem.applicationDataDirectory + "/logfile.zip";
                loading.message = "Compressing Encrypted File...";
                Compression.zip(writeToZip, [ encryptedLogFile.resolve() ]);
                acs.emailSend({
                    loading: loading,
                    window: $.drivingWin,
                    message: report,
                    recipients: settings.reportEmail,
                    name: settings.driverName,
                    attachment: "logfile.zip"
                });
                $.status.text = "Put vehicle in gear to start...";
            }
        } else {
            1 == e.parkingBrakeStatus && appAlert("WARNING: Your parking break is still on.");
            getCloud();
            if (vehicleObject) {
                vehicleObject.addEventListener("vehicleBehavior", didReceiveVehicleBehavior);
                vehicleObject.addEventListener("vehicleStatus", didReceiveVehicleStatus);
            }
            track.transmission.flag = true;
            var startTime = new Date().toLocaleString();
            track.trip.start = startTime;
            createReport(startTime);
            $.status.text = "Put vehicle in park to stop tracking...";
            appAlert("Start: " + track.trip.start);
        }
        track.transmission.status = e.transmissionRange;
    }
    function didReceiveVehicleStatus(e) {
        $.engineTemp.text = "Engine Water Temp: " + e.engineWaterTemperature + settings.engineTemp.extension;
        $.outsideTemp.text = "Outside Temp: " + e.outsideTemperature + settings.outsideTemp.extension;
        var d = new Date();
        var n = d.getHours();
        if (n > 16 && !track.light.flag && "off" == e.frontLightStatus) {
            appAlert("WARNING: Headlights are currently " + e.frontLightStatus);
            track.light.flag = true;
        }
        e.engineWaterTemperature > 80 && appAlert("Car overheating! Water Temp at " + e.engineWaterTemperature + " celsius.");
        3 >= e.outsideTemperature && !track.temp.flag ? appAlert("Be careful, its cold " + e.outsideTemperature + " celsius") : e.outsideTemperature > 3 && track.temp.flag && (track.temp.flag = false);
        null == track.temp.min && (track.temp.min = e.outsideTemperature);
        null == track.temp.max && (track.temp.min = e.outsideTemperature);
        e.outsideTemperature > track.temp.max && (track.temp.max = e.outsideTemperature);
        e.outsideTemperature < track.temp.min && (track.temp.min = e.outsideTemperature);
    }
    function startSimulation() {
        if (null == simulationInt) {
            var startTime = new Date().toLocaleString();
            track.trip.start = startTime;
            createReport(startTime);
            appAlert("Start: " + track.trip.start);
            simulationArr = [];
            $.status.text = "Tracking Simulation";
            $.simulateBtn.title = "Stop Simulation";
            $.connectBtn && $.connectBtn.hide();
            track.transmission.flag = true;
            simulate();
            simulationInt = setInterval(simulate, 2e3);
        } else {
            simulate(true);
            clearInterval(simulationInt);
            simulationInt = null;
            $.simulateBtn.title = "Start Auto Simulation";
            true && "Simulator" == Titanium.Platform.model && $.connectBtn && $.connectBtn.show();
        }
    }
    function random(e) {
        return Math.floor(Math.random() * e);
    }
    function simulate(end) {
        var speed = random(120);
        var temp = random(100);
        didReceiveVehicleBehavior({
            vehicleSpeed: speed,
            throttlePosition: random(100),
            engineSpeed: random(9e3),
            accelerationX: random(15)
        });
        didReceiveVehicleStatus({
            frontLightStatus: "on",
            engineWaterTemperature: temp,
            outsideTemperature: random(10)
        });
        didReceiveDrivingOperation({
            parkingBrakeStatus: 0,
            transmissionRange: end ? 0 : 1
        });
        var dataBody = {
            CustomerID: 10,
            VehicleId: 15,
            OdometerRead: 2013,
            Location: "test location",
            Speed: speed,
            Elevation: "1035 ft",
            Temperature: temp,
            FuelLevel: 75,
            BatteryLevel: 85,
            DiagnosisCode: 15234
        };
        simulationArr.push(dataBody);
    }
    function updateSettings(e) {
        "driverName" != e.source.type && "reportEmail" != e.source.type ? e.source.value.length > 0 && (settings[e.source.type].max = settings[e.source.type].conversion ? conversion[e.source.type]({
            type: "in",
            value: e.source.value
        }) : e.source.value) : settings[e.source.type] = e.source.value;
    }
    function addExtension(e) {
        e.source.value ? e.source.value += settings[e.source.type].extension : e.source.value = settings[e.source.type].conversion ? conversion[e.source.type]({
            type: "out",
            value: settings[e.source.type].max
        }) + settings[e.source.type].extension : settings[e.source.type].max + settings[e.source.type].extension;
        updateCloud();
    }
    function updateCloud() {
        Ti.App.Properties.hasProperty("pushID") && (Ti.App.Properties.hasProperty("userLink") ? acs.updateUserLink(settings, populateSettings) : acs.createUserLink(settings));
    }
    function getCloud() {
        Ti.App.Properties.hasProperty("userLink") && acs.getUserLink(function(e) {
            populateSettings(e);
        });
    }
    function loggedIn() {
        if (!Ti.App.Properties.hasProperty("deviceToken")) {
            acs.pushRegister();
            getCloud();
        }
    }
    function createReport(startTime) {
        report = "<p><b>Drive Track Driving Report Details for " + settings.driverName + "</b><br><br>Start Time: " + startTime + "</p><p>";
    }
    function finalizeReport(endTime) {
        report += "</p><p>End Time: " + endTime + "<br><br>Max Speed: " + track.vehicleSpeed.max + settings.vehicleSpeed.extension + "<br>Max RPMs: " + track.engineSpeed.max + settings.engineSpeed.extension + "<br>Max Acceleration: " + track.accelerationX.max + settings.accelerationX.extension + "<br>Max Throttle: " + track.throttlePosition.max + settings.throttlePosition.extension + "<br></p>";
        track.vehicleSpeed.max = 0;
        track.engineSpeed.max = 0;
        track.accelerationX.max = 0;
        track.throttlePosition.max = 0;
    }
    function showParent() {
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
    function windowFocus(evt) {
        showParent();
        "naviWin" == evt.source.id && (Titanium.Platform.canOpenURL("navicon://") || navi.installNavi());
    }
    function appAlert(message) {
        var current = $.alertLabel.text || "";
        $.alertLabel.show();
        var log = "[INFO]: " + message + "\n";
        $.alertLabel.text = log + current;
        var writeLog = crypto.encrypt({
            source: log,
            type: "TYPE_HEXSTRING"
        });
        "" == current ? logFile.write(writeLog, false) : logFile.write(writeLog, true);
    }
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "index";
    arguments[0] ? arguments[0]["__parentSymbol"] : null;
    arguments[0] ? arguments[0]["$model"] : null;
    arguments[0] ? arguments[0]["__itemTemplate"] : null;
    var $ = this;
    var exports = {};
    var __defers = {};
    var __alloyId0 = [];
    $.__views.drivingWin = Ti.UI.createWindow({
        backgroundColor: "#fff",
        navBarHidden: "true",
        id: "drivingWin"
    });
    windowFocus ? $.__views.drivingWin.addEventListener("focus", windowFocus) : __defers["$.__views.drivingWin!focus!windowFocus"] = true;
    $.__views.drivingHeader = Alloy.createWidget("com.appcelerator.header", "widget", {
        id: "drivingHeader",
        __parentSymbol: $.__views.drivingWin
    });
    $.__views.drivingHeader.setParent($.__views.drivingWin);
    $.__views.drivingContent = Ti.UI.createView({
        layout: "vertical",
        top: 60,
        id: "drivingContent"
    });
    $.__views.drivingWin.add($.__views.drivingContent);
    $.__views.connectBtn = Ti.UI.createButton({
        width: "75%",
        height: 30,
        top: 10,
        color: "#000",
        borderWidth: 1,
        borderRadius: 5,
        title: "Connect to Vehicle",
        id: "connectBtn"
    });
    $.__views.drivingContent.add($.__views.connectBtn);
    vehicleConnect ? $.__views.connectBtn.addEventListener("click", vehicleConnect) : __defers["$.__views.connectBtn!click!vehicleConnect"] = true;
    $.__views.simulateBtn = Ti.UI.createButton({
        width: "75%",
        height: 30,
        top: 10,
        color: "#000",
        borderWidth: 1,
        borderRadius: 5,
        title: "Start Auto Simulation",
        id: "simulateBtn"
    });
    $.__views.drivingContent.add($.__views.simulateBtn);
    startSimulation ? $.__views.simulateBtn.addEventListener("click", startSimulation) : __defers["$.__views.simulateBtn!click!startSimulation"] = true;
    $.__views.status = Ti.UI.createLabel({
        width: Ti.UI.SIZE,
        height: Ti.UI.SIZE,
        color: "#000",
        font: {
            fontWeight: "bold"
        },
        textAlign: "center",
        top: 10,
        id: "status"
    });
    $.__views.drivingContent.add($.__views.status);
    $.__views.maxThrottle = Ti.UI.createLabel({
        width: Ti.UI.SIZE,
        height: Ti.UI.SIZE,
        color: "#000",
        font: {
            fontSize: 16,
            fontFamily: "Helvetica Neue"
        },
        textAlign: "center",
        top: 10,
        id: "maxThrottle"
    });
    $.__views.drivingContent.add($.__views.maxThrottle);
    $.__views.maxSpeed = Ti.UI.createLabel({
        width: Ti.UI.SIZE,
        height: Ti.UI.SIZE,
        color: "#000",
        font: {
            fontSize: 16,
            fontFamily: "Helvetica Neue"
        },
        textAlign: "center",
        top: 10,
        id: "maxSpeed"
    });
    $.__views.drivingContent.add($.__views.maxSpeed);
    $.__views.maxRpm = Ti.UI.createLabel({
        width: Ti.UI.SIZE,
        height: Ti.UI.SIZE,
        color: "#000",
        font: {
            fontSize: 16,
            fontFamily: "Helvetica Neue"
        },
        textAlign: "center",
        top: 10,
        id: "maxRpm"
    });
    $.__views.drivingContent.add($.__views.maxRpm);
    $.__views.maxAcceleration = Ti.UI.createLabel({
        width: Ti.UI.SIZE,
        height: Ti.UI.SIZE,
        color: "#000",
        font: {
            fontSize: 16,
            fontFamily: "Helvetica Neue"
        },
        textAlign: "center",
        top: 10,
        id: "maxAcceleration"
    });
    $.__views.drivingContent.add($.__views.maxAcceleration);
    $.__views.engineTemp = Ti.UI.createLabel({
        width: Ti.UI.SIZE,
        height: Ti.UI.SIZE,
        color: "#000",
        font: {
            fontSize: 16,
            fontFamily: "Helvetica Neue"
        },
        textAlign: "center",
        top: 10,
        id: "engineTemp"
    });
    $.__views.drivingContent.add($.__views.engineTemp);
    $.__views.outsideTemp = Ti.UI.createLabel({
        width: Ti.UI.SIZE,
        height: Ti.UI.SIZE,
        color: "#000",
        font: {
            fontSize: 16,
            fontFamily: "Helvetica Neue"
        },
        textAlign: "center",
        top: 10,
        id: "outsideTemp"
    });
    $.__views.drivingContent.add($.__views.outsideTemp);
    $.__views.logScroll = Ti.UI.createScrollView({
        layout: "vertical",
        top: 10,
        bottom: 0,
        width: Ti.UI.FILL,
        contentWidth: Ti.UI.FILL,
        id: "logScroll"
    });
    $.__views.drivingContent.add($.__views.logScroll);
    $.__views.alertLabel = Ti.UI.createLabel({
        width: Ti.UI.FILL,
        height: Ti.UI.SIZE,
        color: "red",
        font: {
            fontWeight: "bold"
        },
        textAlign: "left",
        top: 0,
        visible: false,
        id: "alertLabel"
    });
    $.__views.logScroll.add($.__views.alertLabel);
    $.__views.__alloyId1 = Ti.UI.createTab({
        window: $.__views.drivingWin,
        title: "Data",
        icon: "dataIcon.png",
        navBarHidden: "true",
        id: "__alloyId1"
    });
    __alloyId0.push($.__views.__alloyId1);
    $.__views.settingsWin = Ti.UI.createWindow({
        backgroundColor: "#fff",
        navBarHidden: "true",
        layout: "vertical",
        id: "settingsWin"
    });
    windowFocus ? $.__views.settingsWin.addEventListener("focus", windowFocus) : __defers["$.__views.settingsWin!focus!windowFocus"] = true;
    $.__views.settingsHeader = Alloy.createWidget("com.appcelerator.header", "widget", {
        id: "settingsHeader",
        __parentSymbol: $.__views.settingsWin
    });
    $.__views.settingsHeader.setParent($.__views.settingsWin);
    $.__views.__alloyId3 = Ti.UI.createScrollView({
        layout: "vertical",
        id: "__alloyId3"
    });
    $.__views.settingsWin.add($.__views.__alloyId3);
    $.__views.__alloyId4 = Ti.UI.createLabel({
        width: Ti.UI.SIZE,
        height: Ti.UI.SIZE,
        color: "#000",
        font: {
            fontSize: 16,
            fontFamily: "Helvetica Neue"
        },
        textAlign: "center",
        top: 10,
        text: "User Info",
        id: "__alloyId4"
    });
    $.__views.__alloyId3.add($.__views.__alloyId4);
    $.__views.driverName = Ti.UI.createTextField({
        width: "70%",
        height: 40,
        borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
        top: 10,
        bottom: 0,
        backgroundColor: "#e0e0e0",
        borderColor: "#000000",
        clearOnEdit: true,
        clearButtonMode: Ti.UI.INPUT_BUTTONMODE_ONFOCUS,
        paddingLeft: 10,
        color: "#000",
        id: "driverName",
        type: "driverName",
        hintText: "Driver Name"
    });
    $.__views.__alloyId3.add($.__views.driverName);
    updateSettings ? $.__views.driverName.addEventListener("change", updateSettings) : __defers["$.__views.driverName!change!updateSettings"] = true;
    updateCloud ? $.__views.driverName.addEventListener("blur", updateCloud) : __defers["$.__views.driverName!blur!updateCloud"] = true;
    $.__views.reportEmail = Ti.UI.createTextField({
        width: "70%",
        height: 40,
        borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
        top: 10,
        bottom: 0,
        backgroundColor: "#e0e0e0",
        borderColor: "#000000",
        clearOnEdit: true,
        clearButtonMode: Ti.UI.INPUT_BUTTONMODE_ONFOCUS,
        paddingLeft: 10,
        color: "#000",
        id: "reportEmail",
        type: "reportEmail",
        hintText: "Report Email",
        visible: "false"
    });
    $.__views.__alloyId3.add($.__views.reportEmail);
    updateSettings ? $.__views.reportEmail.addEventListener("change", updateSettings) : __defers["$.__views.reportEmail!change!updateSettings"] = true;
    updateCloud ? $.__views.reportEmail.addEventListener("blur", updateCloud) : __defers["$.__views.reportEmail!blur!updateCloud"] = true;
    $.__views.reportLabel = Ti.UI.createLabel({
        width: Ti.UI.SIZE,
        height: Ti.UI.SIZE,
        color: "#000",
        font: {
            fontSize: 16,
            fontFamily: "Helvetica Neue"
        },
        textAlign: "center",
        top: 10,
        text: "Reporting Limits",
        id: "reportLabel",
        visible: "false"
    });
    $.__views.__alloyId3.add($.__views.reportLabel);
    $.__views.vehicleSpeedMax = Ti.UI.createTextField({
        width: "70%",
        height: 40,
        borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
        top: 10,
        bottom: 0,
        backgroundColor: "#e0e0e0",
        borderColor: "#000000",
        clearOnEdit: true,
        clearButtonMode: Ti.UI.INPUT_BUTTONMODE_ONFOCUS,
        paddingLeft: 10,
        color: "#000",
        id: "vehicleSpeedMax",
        type: "vehicleSpeed",
        hintText: "Speed Limit",
        visible: "false"
    });
    $.__views.__alloyId3.add($.__views.vehicleSpeedMax);
    updateSettings ? $.__views.vehicleSpeedMax.addEventListener("change", updateSettings) : __defers["$.__views.vehicleSpeedMax!change!updateSettings"] = true;
    addExtension ? $.__views.vehicleSpeedMax.addEventListener("blur", addExtension) : __defers["$.__views.vehicleSpeedMax!blur!addExtension"] = true;
    $.__views.throttlePositionMax = Ti.UI.createTextField({
        width: "70%",
        height: 40,
        borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
        top: 10,
        bottom: 0,
        backgroundColor: "#e0e0e0",
        borderColor: "#000000",
        clearOnEdit: true,
        clearButtonMode: Ti.UI.INPUT_BUTTONMODE_ONFOCUS,
        paddingLeft: 10,
        color: "#000",
        id: "throttlePositionMax",
        type: "throttlePosition",
        hintText: "Throttle Position",
        visible: "false"
    });
    $.__views.__alloyId3.add($.__views.throttlePositionMax);
    updateSettings ? $.__views.throttlePositionMax.addEventListener("change", updateSettings) : __defers["$.__views.throttlePositionMax!change!updateSettings"] = true;
    addExtension ? $.__views.throttlePositionMax.addEventListener("blur", addExtension) : __defers["$.__views.throttlePositionMax!blur!addExtension"] = true;
    $.__views.engineSpeedMax = Ti.UI.createTextField({
        width: "70%",
        height: 40,
        borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
        top: 10,
        bottom: 0,
        backgroundColor: "#e0e0e0",
        borderColor: "#000000",
        clearOnEdit: true,
        clearButtonMode: Ti.UI.INPUT_BUTTONMODE_ONFOCUS,
        paddingLeft: 10,
        color: "#000",
        id: "engineSpeedMax",
        type: "engineSpeed",
        hintText: "RPM Limit",
        visible: "false"
    });
    $.__views.__alloyId3.add($.__views.engineSpeedMax);
    updateSettings ? $.__views.engineSpeedMax.addEventListener("change", updateSettings) : __defers["$.__views.engineSpeedMax!change!updateSettings"] = true;
    addExtension ? $.__views.engineSpeedMax.addEventListener("blur", addExtension) : __defers["$.__views.engineSpeedMax!blur!addExtension"] = true;
    $.__views.accelerationXMax = Ti.UI.createTextField({
        width: "70%",
        height: 40,
        borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
        top: 10,
        bottom: 0,
        backgroundColor: "#e0e0e0",
        borderColor: "#000000",
        clearOnEdit: true,
        clearButtonMode: Ti.UI.INPUT_BUTTONMODE_ONFOCUS,
        paddingLeft: 10,
        color: "#000",
        id: "accelerationXMax",
        type: "accelerationX",
        hintText: "G-Force Limit",
        visible: "false"
    });
    $.__views.__alloyId3.add($.__views.accelerationXMax);
    updateSettings ? $.__views.accelerationXMax.addEventListener("change", updateSettings) : __defers["$.__views.accelerationXMax!change!updateSettings"] = true;
    addExtension ? $.__views.accelerationXMax.addEventListener("blur", addExtension) : __defers["$.__views.accelerationXMax!blur!addExtension"] = true;
    $.__views.__alloyId2 = Ti.UI.createTab({
        window: $.__views.settingsWin,
        title: "Settings",
        icon: "settingsIcon.png",
        navBarHidden: "true",
        id: "__alloyId2"
    });
    __alloyId0.push($.__views.__alloyId2);
    $.__views.naviWin = Ti.UI.createWindow({
        backgroundColor: "#fff",
        navBarHidden: "true",
        layout: "vertical",
        id: "naviWin"
    });
    windowFocus ? $.__views.naviWin.addEventListener("focus", windowFocus) : __defers["$.__views.naviWin!focus!windowFocus"] = true;
    $.__views.naviHeader = Alloy.createWidget("com.appcelerator.header", "widget", {
        id: "naviHeader",
        __parentSymbol: $.__views.naviWin
    });
    $.__views.naviHeader.setParent($.__views.naviWin);
    $.__views.locations = Ti.UI.createScrollView({
        layout: "vertical",
        id: "locations"
    });
    $.__views.naviWin.add($.__views.locations);
    naviClick ? $.__views.locations.addEventListener("click", naviClick) : __defers["$.__views.locations!click!naviClick"] = true;
    $.__views.__alloyId5 = Ti.UI.createTab({
        window: $.__views.naviWin,
        title: "Navi",
        icon: "navIcon.png",
        navBarHidden: "true",
        id: "__alloyId5"
    });
    __alloyId0.push($.__views.__alloyId5);
    $.__views.index = Ti.UI.createTabGroup({
        tabs: __alloyId0,
        navBarHidden: "true",
        id: "index"
    });
    $.__views.index && $.addTopLevelView($.__views.index);
    exports.destroy = function() {};
    _.extend($, $.__views);
    $.index.open();
    var logFile = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, "driving_log.txt");
    var crypto = require("crypto");
    crypto.init("KEYSIZE_AES128");
    var navi = require("ti.navibridge");
    navi.setApplicationId("ICiAV4Ay");
    vehicleModule = require("jp.co.denso.vehiclemodule");
    var acs = require("acs"), vehicleObject = null, report = "", simulationArr = [], simulationInt = null, track = {
        throttlePosition: {
            flag: false,
            max: 0,
            current: 0
        },
        vehicleSpeed: {
            flag: false,
            max: 0,
            current: 0
        },
        accelerationX: {
            flag: false,
            max: 0,
            current: 0
        },
        engineSpeed: {
            flag: false,
            max: 0,
            current: 0
        },
        engineTemp: {
            flag: false,
            max: 0,
            current: 0
        },
        outsideTemp: {
            flag: false,
            max: 0,
            current: 0
        },
        transmission: {
            flag: false,
            status: null
        },
        trip: {
            start: null,
            end: null
        },
        temp: {
            flag: false,
            min: null,
            max: null
        },
        light: {
            flag: false
        },
        location: {
            flag: false,
            lat: null,
            lon: null
        }
    }, settings = {
        driverName: "Telematics Demo",
        reportEmail: "aleard@appcelerator.com",
        throttlePosition: {
            max: 75,
            notify: true,
            extension: "%"
        },
        vehicleSpeed: {
            max: 105,
            notify: true,
            extension: " mph",
            conversion: true
        },
        accelerationX: {
            max: 10,
            notify: true,
            extension: " g-force",
            conversion: true
        },
        engineSpeed: {
            max: 8e3,
            notify: true,
            extension: " rpm",
            conversion: true
        },
        engineTemp: {
            max: 80,
            notify: true,
            extension: " celsius",
            conversion: false
        },
        outsideTemp: {
            max: 3,
            notify: true,
            extension: " celsius",
            conversion: false
        },
        latitude: {
            max: null,
            min: null,
            notify: true
        },
        longitude: {
            max: null,
            min: null,
            notify: true
        }
    }, conversion = {
        vehicleSpeed: function(e) {
            return "out" == e.type ? Math.round(.621371 * parseFloat(e.value)) : Math.round(1.60934 * parseFloat(e.value));
        },
        accelerationX: function(e) {
            return "out" == e.type ? (parseFloat(e.value) / 9.8).toFixed(2) : 9.8 * parseFloat(e.value);
        },
        engineSpeed: function(e) {
            return e.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        engineTemp: function(e) {
            return 1.8 * e.value;
        }
    };
    if (Ti.App.Properties.hasProperty("UUID")) acs.userLogin({
        success: loggedIn
    }); else {
        Ti.App.Properties.setString("UUID", Ti.Platform.createUUID());
        acs.userCreate({
            success: loggedIn
        });
    }
    populateSettings();
    $.drivingHeader && $.drivingHeader.setTitle("Telematics Drive");
    $.settingsHeader && $.settingsHeader.setTitle("Drive Settings");
    $.naviHeader && $.naviHeader.setTitle("Navi Demo");
    var data = [ {
        lat: 37.389569,
        lon: -122.050212,
        title: "Appcelerator",
        image: "http://media.tumblr.com/tumblr_m1hzbmMNrs1qznie6.jpg"
    }, {
        lat: 37.331689,
        lon: -122.030731,
        title: "Apple",
        image: "http://www.bangor.ac.uk/itservices/office365/images/apple.png"
    }, {
        lat: 37.422502,
        lon: -122.0855498,
        title: "Google",
        image: "https://cdn1.iconfinder.com/data/icons/yooicons_set01_socialbookmarks/512/social_google_box.png"
    } ];
    for (var i in data) {
        var row = Alloy.createController("row", data[i]).getView();
        $.locations.add(row);
    }
    $.locations.add(Alloy.createController("row", {
        title: "All Locations",
        image: "/navIcon.png"
    }).getView());
    if ("iphone" === Ti.Platform.osname || "ipad" === Ti.Platform.osname) {
        var touchTestModule = void 0;
        try {
            touchTestModule = require("com.soasta.touchtest");
        } catch (tt_exception) {
            Ti.API.error("com.soasta.touchest module is required");
        }
        var cloudTestURL = Ti.App.getArguments().url;
        null != cloudTestURL && touchTestModule && touchTestModule.initTouchTest(cloudTestURL);
        Ti.App.addEventListener("resumed", function() {
            var cloudTestURL = Ti.App.getArguments().url;
            null != cloudTestURL && touchTestModule && touchTestModule.initTouchTest(cloudTestURL);
        });
    }
    __defers["$.__views.drivingWin!focus!windowFocus"] && $.__views.drivingWin.addEventListener("focus", windowFocus);
    __defers["$.__views.connectBtn!click!vehicleConnect"] && $.__views.connectBtn.addEventListener("click", vehicleConnect);
    __defers["$.__views.simulateBtn!click!startSimulation"] && $.__views.simulateBtn.addEventListener("click", startSimulation);
    __defers["$.__views.settingsWin!focus!windowFocus"] && $.__views.settingsWin.addEventListener("focus", windowFocus);
    __defers["$.__views.driverName!change!updateSettings"] && $.__views.driverName.addEventListener("change", updateSettings);
    __defers["$.__views.driverName!blur!updateCloud"] && $.__views.driverName.addEventListener("blur", updateCloud);
    __defers["$.__views.reportEmail!change!updateSettings"] && $.__views.reportEmail.addEventListener("change", updateSettings);
    __defers["$.__views.reportEmail!blur!updateCloud"] && $.__views.reportEmail.addEventListener("blur", updateCloud);
    __defers["$.__views.vehicleSpeedMax!change!updateSettings"] && $.__views.vehicleSpeedMax.addEventListener("change", updateSettings);
    __defers["$.__views.vehicleSpeedMax!blur!addExtension"] && $.__views.vehicleSpeedMax.addEventListener("blur", addExtension);
    __defers["$.__views.throttlePositionMax!change!updateSettings"] && $.__views.throttlePositionMax.addEventListener("change", updateSettings);
    __defers["$.__views.throttlePositionMax!blur!addExtension"] && $.__views.throttlePositionMax.addEventListener("blur", addExtension);
    __defers["$.__views.engineSpeedMax!change!updateSettings"] && $.__views.engineSpeedMax.addEventListener("change", updateSettings);
    __defers["$.__views.engineSpeedMax!blur!addExtension"] && $.__views.engineSpeedMax.addEventListener("blur", addExtension);
    __defers["$.__views.accelerationXMax!change!updateSettings"] && $.__views.accelerationXMax.addEventListener("change", updateSettings);
    __defers["$.__views.accelerationXMax!blur!addExtension"] && $.__views.accelerationXMax.addEventListener("blur", addExtension);
    __defers["$.__views.naviWin!focus!windowFocus"] && $.__views.naviWin.addEventListener("focus", windowFocus);
    __defers["$.__views.locations!click!naviClick"] && $.__views.locations.addEventListener("click", naviClick);
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;