// START: APM service code injection
// Require the apm module
Alloy.Globals.apm = undefined;
try {
Alloy.Globals.apm = require("com.appcelerator.apm");
}
catch (e) {
Ti.API.info("com.appcelerator.apm module is not available");
}

// Initialize the module if it is defined
Alloy.Globals.apm && Alloy.Globals.apm.init();
// END: APM code injection

