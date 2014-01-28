var Alloy = require("alloy"), _ = Alloy._, Backbone = Alloy.Backbone;

Alloy.Globals.apm = void 0;

try {
    Alloy.Globals.apm = require("com.appcelerator.apm");
} catch (e) {
    Ti.API.info("com.appcelerator.apm module is not available");
}

Alloy.Globals.apm && Alloy.Globals.apm.init();

Alloy.createController("index");