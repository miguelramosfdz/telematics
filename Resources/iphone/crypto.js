var Crypto = require("ti.crypto");

module.exports = function() {
    var API = {
        params: null,
        cryptor: null,
        key: null,
        initializationVector: null,
        init: function(_keySize) {
            API.keySize = Crypto[_keySize];
            API.key = Ti.createBuffer({
                length: API.keySize
            });
            switch (API.keySize) {
              case 1:
                Crypto.encodeData({
                    source: "11",
                    dest: API.key,
                    type: Crypto.TYPE_HEXSTRING
                });
                break;

              case 5:
                Crypto.encodeData({
                    source: "00 11 22 33 44",
                    dest: API.key,
                    type: Crypto.TYPE_HEXSTRING
                });
                break;

              case 8:
                Crypto.encodeData({
                    source: "0011223344556677",
                    dest: API.key,
                    type: Crypto.TYPE_HEXSTRING
                });
                break;

              case 16:
                Crypto.encodeData({
                    source: "001122334455667788990a0b0c0d0e0f",
                    dest: API.key,
                    type: Crypto.TYPE_HEXSTRING
                });
                break;

              case 24:
                API.key.value = "abcdefghijklmnopqrstuvwx";
                break;

              case 32:
                API.key.value = "abcdefghijklmnopqrstuvwxyz012345";
                break;

              case 128:
                API.key.value = "00000000001111111111222222222233333333334444444444555555555566666666667777777777888888888899999999990000000000111111111122222222";
                break;

              case 512:
                var string100 = "0000000000111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999";
                API.key.value = string100 + string100 + string100 + string100 + string100 + "012345678901";
            }
            API.initializationVector = Ti.createBuffer({
                length: 16
            });
            Crypto.encodeData({
                source: "00 11 22 33 44 55 66 77 88 99 aa bb cc dd ee ff",
                dest: API.initializationVector,
                type: Crypto.TYPE_HEXSTRING
            });
            API.cryptor = Crypto.createCryptor({
                algorithm: Crypto.ALGORITHM_AES128,
                options: Crypto.OPTION_PKCS7PADDING,
                key: API.key,
                initializationVector: API.initializationVector,
                resizeBuffer: true
            });
        },
        cleanup: function() {
            API.params = null;
            API.cryptor = null;
            API.key = null;
            API.initializationVector = null;
        },
        encrypt: function(e) {
            var buffer = Ti.createBuffer({
                length: e.source.length
            });
            Crypto.encodeData({
                source: e.source,
                dest: buffer,
                type: Crypto[e.type]
            });
            var numBytes = API.cryptor.encrypt(buffer);
            if (!(0 > numBytes)) return "TYPE_BLOB" == e.type ? buffer : Crypto.decodeData({
                source: buffer,
                type: Crypto.TYPE_BASE64STRING
            });
            alert("Error occurred during encryption: " + numBytes);
        },
        decrypt: function(e) {
            var buffer = Ti.createBuffer({
                length: e.source.length
            });
            var length = Crypto.encodeData({
                source: e.source,
                dest: buffer,
                type: Crypto[e.type]
            });
            if (0 > length) {
                Ti.API.info("ERROR: Buffer too small");
                return;
            }
            var numBytes = API.cryptor.decrypt(buffer, length);
            if (!(0 > numBytes)) return buffer;
            alert("Error occurred during encryption: " + numBytes);
        }
    };
    return API;
}();