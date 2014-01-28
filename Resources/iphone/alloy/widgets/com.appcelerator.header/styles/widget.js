function WPATH(s) {
    var index = s.lastIndexOf("/");
    var path = -1 === index ? "com.appcelerator.header/" + s : s.substring(0, index) + "/com.appcelerator.header/" + s.substring(index + 1);
    return path;
}

module.exports = [ {
    isApi: true,
    priority: 1000.0001,
    key: "Window",
    style: {
        backgroundColor: "#fff",
        navBarHidden: true
    }
}, {
    isApi: true,
    priority: 1000.0002,
    key: "Label",
    style: {
        width: Ti.UI.SIZE,
        height: Ti.UI.SIZE,
        color: "#000",
        font: {
            fontSize: 16,
            fontFamily: "Helvetica Neue"
        },
        textAlign: "center",
        top: 10
    }
}, {
    isApi: true,
    priority: 1000.0003,
    key: "Button",
    style: {
        width: "75%",
        height: 30,
        top: 10,
        color: "#000",
        borderWidth: 1,
        borderRadius: 5
    }
}, {
    isApi: true,
    priority: 1000.0004,
    key: "TextField",
    style: {
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
        color: "#000"
    }
}, {
    isApi: true,
    priority: 1000.0005,
    key: "ScrollView",
    style: {
        layout: "vertical"
    }
}, {
    isClass: true,
    priority: 10000.0002,
    key: "container",
    style: {
        height: 60,
        width: Ti.UI.FILL,
        top: 0,
        backgroundImage: "/bg.png"
    }
}, {
    isId: true,
    priority: 100000.0003,
    key: "logo",
    style: {
        backgroundImage: "/appicon.png",
        height: 35,
        width: 35,
        left: 5,
        bottom: 5
    }
}, {
    isId: true,
    priority: 100000.0004,
    key: "banner",
    style: {
        bottom: 0,
        left: 50,
        height: 40,
        width: Ti.UI.FILL,
        duration: 1e4
    }
}, {
    isId: true,
    priority: 100000.0005,
    key: "title",
    style: {
        bottom: 0,
        left: 0,
        height: 40,
        width: Ti.UI.FILL,
        font: {
            fontWeight: "bold",
            fontSize: "18"
        },
        paddingLeft: 50,
        paddingRight: 50,
        textAlignment: "center",
        verticalAlign: Ti.UI.TEXT_VERTICAL_ALIGNMENT_BOTTOM,
        color: "#fff"
    }
} ];