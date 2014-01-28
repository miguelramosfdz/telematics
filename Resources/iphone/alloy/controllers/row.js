function Controller() {
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "row";
    arguments[0] ? arguments[0]["__parentSymbol"] : null;
    arguments[0] ? arguments[0]["$model"] : null;
    arguments[0] ? arguments[0]["__itemTemplate"] : null;
    var $ = this;
    var exports = {};
    $.__views.row = Ti.UI.createView({
        height: 50,
        id: "row"
    });
    $.__views.row && $.addTopLevelView($.__views.row);
    $.__views.content = Ti.UI.createView({
        touchEnabled: false,
        layout: "horizontal",
        top: 5,
        bottom: 5,
        id: "content"
    });
    $.__views.row.add($.__views.content);
    $.__views.image = Ti.UI.createImageView({
        touchEnabled: false,
        left: 10,
        height: 40,
        width: 40,
        id: "image"
    });
    $.__views.content.add($.__views.image);
    $.__views.title = Ti.UI.createLabel({
        width: Ti.UI.SIZE,
        height: Ti.UI.SIZE,
        color: "#000",
        font: {
            fontSize: 16,
            fontFamily: "Helvetica Neue"
        },
        textAlign: "center",
        top: 10,
        touchEnabled: false,
        left: 10,
        id: "title"
    });
    $.__views.content.add($.__views.title);
    $.__views.divider = Ti.UI.createView({
        touchEnabled: false,
        height: 1,
        left: 5,
        right: 5,
        bottom: 0,
        backgroundColor: "#000",
        id: "divider"
    });
    $.__views.row.add($.__views.divider);
    exports.destroy = function() {};
    _.extend($, $.__views);
    var args = arguments[0] || {};
    $.title.text = "Send " + args.title + " to Vehicle";
    $.image.image = args.image;
    $.row.applyProperties(args);
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;