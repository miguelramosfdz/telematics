var Cloud = require('ti.cloud');
var acs = {
	pushNotify: function (params){
		var message = params.payload;
		if(params && params.payload){
			message = params.payload;
		} else {
			message = 'Test Push Notification';
		}
		
		if(Ti.App.Properties.hasProperty('pushID') && Titanium.Platform.model != 'Simulator'){
			
			Cloud.PushNotifications.notify({
			    channel: 'driver_track',
			    payload: message?message:{ 
			    	"sound": "default",
				    "alert" : "Push Notification Test"
				},
			    to_ids:Ti.App.Properties.getString('pushID')?Ti.App.Properties.getString('pushID'):'50d523e8222b3a051303286d' //Ti.App.Properties.getString('userID')
			}, function (e) {
			    if (e.success) {
			        alert('Notify: Success');
			    } else {
			        params.callback && params.callback({error:e.error, message:e.message});
			    }
			});
		} else {
			var alertDialog = Ti.UI.createAlertDialog({
	        	title:"Simulated Push to Parent",
	        	message:message
	        }).show();
		}
	},
	pushSubscribe: function (params){
		
		Cloud.PushNotifications.subscribe({
		    channel: Alloy.CFG.theme || "Honda",
		    device_token: Ti.App.Properties.getString('deviceToken'),
		    type:params.type
		}, function (e) {
		    if (e.success) {
		        alert('Successfully Subscribed for '+Alloy.CFG.theme+' push notifications.');
		    } else {
		        alert(e.error +"\n"+e.message);
		    }
		});
	},
	pushRegister: function (params) {
		
	    if (Titanium.Platform.model == 'Simulator' && OS_IOS) {
	       Ti.API.info('The simulator does not support push!');
	      
	        return;
	    } else {
	    	if(OS_IOS){

			    Ti.Network.registerForPushNotifications({
			        types: [
			            Ti.Network.NOTIFICATION_TYPE_BADGE,
			            Ti.Network.NOTIFICATION_TYPE_ALERT,
			            Ti.Network.NOTIFICATION_TYPE_SOUND
			        ],
			        success: function(x){
			        	Ti.App.Properties.setString('deviceToken', x.deviceToken);
			        	params.success && params.success({deviceToken:x.deviceToken});
			        	acs.pushSubscribe({type:"ios"});
			        },
			        error: function(){
			        	alert('Failed to register for push! ' + x.error);
			        },
			        callback: function (x) {
					    alert('Received push: ' + JSON.stringify(x));
					}
			    });
			} else {
				// Require in the module
				var CloudPush = require('ti.cloudpush');
				var deviceToken = null;
				 
				// Initialize the module
				CloudPush.retrieveDeviceToken({
				    success: deviceTokenSuccess,
				    error: deviceTokenError
				});
				
				// Enable push notifications for this device
				// Save the device token for subsequent API calls
				function deviceTokenSuccess(n) {
				   // CloudPush.enabled = true;
				    deviceToken = n.deviceToken;
				    Ti.App.Properties.setString('deviceToken', n.deviceToken);
				    acs.pushSubscribe({type:"android"});
				}
				function deviceTokenError(n) {
				    alert('Failed to register for push notifications! ' + n.error);
				}
				// Process incoming push notifications
				CloudPush.addEventListener('callback', function (evt) {
					var message = JSON.parse(evt.payload);
				    alert(message);
				});
				// Triggered when the push notifications is in the tray when the app is not running
				CloudPush.addEventListener('trayClickLaunchedApp', function (evt) {
				    Ti.API.info('Tray Click Launched App (app was not running)');
				});
				// Triggered when the push notifications is in the tray when the app is running
				CloudPush.addEventListener('trayClickFocusedApp', function (evt) {
				    Ti.API.info('Tray Click Focused App (app was already running)');
				});
			}
		}
	},
	emailSend: function (params){
		
		params.loading && params.loading.setMessage("Transfering Encrypted Driving Log...");

		if(params.attachment){
			Cloud.Files.create({
			    name: params.attachment,
			    file: Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,params.attachment)
			}, function (e) {
			    if (e.success) {
			    	
			        queryFile(e.files[0].id);
			        
			    } else {
			    	params.window && params.window.remove(params.loading);
			        alert('Error:\n' +
			            ((e.error && e.message) || JSON.stringify(e)));
			    }
			});
		} else {
			sendMail();
		}
		function queryFile(id){
			Cloud.Files.show({
	        	file_id :id
	        }, function (e) {
			    if (e.success && e.files[0].processed == true) {
			        sendMail(e.files[0].url);
			    } else if(e.success && e.files[0].processed == false){
			    	queryFile(id);
			    } else{
			    	params.window && params.window.remove(params.loading);
			        alert('Error:\n' +
			            ((e.error && e.message) || JSON.stringify(e)));
			    }
			});
		}
		function sendMail(attachment){
			params.loading && params.loading.setMessage("Emailing Encrypted Driving Report...");
			Cloud.Emails.send({
			    template: 'drivingReport',
			    recipients: params.recipients?params.recipients:'aleard@appcelerator.com',
			    message:params.message,
			    name:params.name,
			    attachment:attachment || null
			}, function (x) {
				params.window && params.window.remove(params.loading);
			    if (x.success) {
			    	if(attachment){
			    		alert('Driving Report Sent with\nEncrypted Log File');
			    	} else {
			    		alert('Driving Report Sent');
			    	}
			        
			    } else {
			    	alert(x.message);
			        params.callback && params.callback({error:x.error, message:x.message});
			    }
			});
		}
		
	},
	userLogin: function (params){
		Cloud.Users.login({
		    login: Ti.App.Properties.getString('UUID'),
		    password: 'test_password'
		}, function (x) {
		    if (x.success) {
		        var user = x.users[0];
		      	
		      	Ti.App.Properties.setString('userID', user.id);
		      	Ti.API.info('Login: Success \n'+Ti.App.Properties.getString('userID'));
		       	params.callback && params.callback({id:user.id, first:user.first_name, last:user.last_name});
		    } else {
		        params.callback && params.callback({error:x.error, message:x.message});
		    }
		});
	},
	userCreate: function (params){
		Cloud.Users.create({
			username:Ti.App.Properties.getString('UUID'),
		    password: 'test_password',
		    password_confirmation: 'test_password'
		}, function (x) {
		    if (x.success) {
		        var user = x.users[0];
		        Ti.App.Properties.setString('userID', user.id);
		       	params.callback && params.callback({id:user.id, first:user.first_name, last:user.last_name});
		    } else {
		        params.callback && params.callback({error:x.error, message:x.message});
		    }
		});
	},
	userShow: function (params){
		Cloud.Users.show({
		    user_id: params.id
		}, function (e) {
		    if (e.success) {
		        var user = e.users[0];
		        params.callback && params.callback('Success:\\n' +
		            'id: ' + user.id + '\\n' +
		            'first name: ' + user.first_name + '\\n' +
		            'last name: ' + user.last_name);
		    } else {
		      	params.callback && params.callback({error:e.error, message:e.message});
		    }
		});
	},
	createUserLink: function(data){
		if(Ti.App.Properties.hasProperty('userID') && Ti.App.Properties.hasProperty('pushID')){
			Cloud.Objects.create({
			    classname: 'userLink',
			    fields: {
			        driver: Ti.App.Properties.getString('userID'),
			        parent: Ti.App.Properties.getString('pushID'),
			        settings: data
			    }
			}, function (e) {
			    if (e.success) {
			        var userLink = e.userLink[0];
			        Ti.API.info('Created Cloud Settings');
			        Ti.App.Properties.setString('userLink', userLink.id);
			    } else {
			        alert('Error:\\n' +
			            ((e.error && e.message) || JSON.stringify(e)));
			    }
			});
		}
	},
	updateUserLink: function(data, callback){
		if(Ti.App.Properties.hasProperty('userID') && Ti.App.Properties.hasProperty('pushID')){
			Cloud.Objects.update({
			    classname: 'userLink',
			    id: Ti.App.Properties.getString('userLink'),
			    fields: {
			        driver: Ti.App.Properties.getString('userID'),
			        parent: Ti.App.Properties.getString('pushID'),
			        settings: data
			    }
			}, function (e) {
			    if (e.success) {
			        var userLink = e.userLink[0];
			        callback(userLink.settings);
			        Ti.API.info('Update Cloud Settings');
			        Ti.App.Properties.setString('userLink', userLink.id);
			    } else {
			        alert('Error:\\n' +
			            ((e.error && e.message) || JSON.stringify(e)));
			    }
			});
		}
	},
	getUserLink: function(callback){
		if(Ti.App.Properties.hasProperty('userLink')){
			Cloud.Objects.show({
				classname:'userLink',
			    ids: Ti.App.Properties.getString('userLink')
			    }, function (e) {
			    if (e.success) {
			        var userLink = e.userLink[0];
			        Ti.App.Properties.setString('userLink', userLink.id);
			        callback(userLink.settings);
			        Ti.API.info('Get User Link');
			        
			    } else {
			        alert('Error:\\n' +
			            ((e.error && e.message) || JSON.stringify(e)));
			    }
			});
		}
	}
};

module.exports = acs;