var telegramApi = (function () {
    var options = {dcID: 2, createNetworker: true};
    var userAuthPromise;

    return {
        addChatUser: addChatUser,
        createChat: createChat,
        createChannel: createChannel,
        getChatLink: getChatLink,
        getDialogs: getDialogs,
        getUserInfo: getUserInfo,
        getUserPhoto: getUserPhoto,
        sendCode: sendCode,
        sendMessage: sendMessage,
        sendSms: sendSms,
        signIn: signIn,
        signUp: signUp,
        setConfig: setConfig,
        startBot: startBot,
        logOut: logOut,
        updateProfile: updateProfile,
        updateProfilePhoto: updateProfilePhoto,
        updateUsername: updateUsername
    };

    /* Public Functions */

    function sendCode(phone_number) {
        return _MtpApiManager.invokeApi('auth.sendCode', {
            phone_number: phone_number,
            sms_type: 5,
            api_id: Config.App.id,
            api_hash: Config.App.hash,
            lang_code: navigator.language || 'en'
        }, options);
    }

    function signIn(phone_number, phone_code_hash, phone_code) {
        return _MtpApiManager.invokeApi('auth.signIn', {
            phone_number: phone_number,
            phone_code_hash: phone_code_hash,
            phone_code: phone_code
        }, options).then(function (result) {
            _MtpApiManager.setUserAuth(options.dcID, {
                id: result.user.id
            });
            userAuthPromise = _saveUserInfo();
        });
    }

    function signUp(phone_number, phone_code_hash, phone_code, first_name, last_name) {
        return _MtpApiManager.invokeApi('auth.signUp', {
            phone_number: phone_number,
            phone_code_hash: phone_code_hash,
            phone_code: phone_code,
            first_name: first_name || '',
            last_name: last_name || ''
        }, options).then(function (result) {
            _MtpApiManager.setUserAuth(options.dcID, {
                id: result.user.id
            });
            userAuthPromise = _saveUserInfo();
        });
    }

    function sendMessage(id, message) {
        return _MtpApiManager.invokeApi('messages.sendMessage', {
            flags: 0,
            peer: _AppPeersManager.getInputPeerByID(id),
            message: message,
            random_id: [nextRandomInt(0xFFFFFFFF), nextRandomInt(0xFFFFFFFF)],
            reply_to_msg_id: 0,
            entities: []
        }); // TODO
    }

    function getDialogs() {
        var dialogs = [];

        return _AppMessagesManager.getConversations('', 0, 20)
            .then(function (result) {
                for (var i = 0, ii = result.dialogs.length; i < ii; i++) {
                    dialogs.push(_AppPeersManager.getPeer(result.dialogs[i].peerID));
                }
                return dialogs;
            });
    }

    function startBot(botName) {
        return _MtpApiManager.invokeApi('contacts.search', {q: botName, limit: 1})
            .then(function (result) {
                _AppUsersManager.saveApiUsers(result.users);
                _AppMessagesManager.startBot(result.users[0].id, 0);
            });
    }

    function sendSms(phone_number, phone_code_hash) {
        return _MtpApiManager.invokeApi('auth.sendSms', {
            phone_number: phone_number,
            phone_code_hash: phone_code_hash
        }, options)
    }

    function setConfig(config) {
        config = config || {};

        config.app = config.app || {};
        config.server = config.server || {};

        config.server.test = config.server.test || [];
        config.server.production = config.server.production || [];

        Config.App.id = config.app.id;
        Config.App.hash = config.app.hash;

        Config.Server.Test = config.server.test;
        Config.Server.Production = config.server.production;

        _MtpApiManager.invokeApi('help.getNearestDc', {}, options).then(function (nearestDcResult) {
            if (nearestDcResult.nearest_dc != nearestDcResult.this_dc) {
                _MtpApiManager.getNetworker(nearestDcResult.nearest_dc, {createNetworker: true});
            }
        });

        userAuthPromise = _saveUserInfo();
    }

    function createChat(title, userIDs) {
        title = title || '';
        userIDs = userIDs || [];

        if (!Array.isArray(userIDs)) {
            throw new Error('[userIDs] is not array');
        }

        var inputUsers = [];

        for (var i = 0; i < userIDs.length; i++) {
            inputUsers.push(_AppUsersManager.getUserInput(userIDs[i]))
        }

        return _MtpApiManager.invokeApi('messages.createChat', {
            title: title,
            users: inputUsers
        }).then(function (updates) {
            _ApiUpdatesManager.processUpdateMessage(updates);
        });
    }

    function addChatUser(chatID, userID) {
        return _MtpApiManager.invokeApi('messages.addChatUser', {
            chat_id: _AppChatsManager.getChatInput(chatID),
            user_id: _AppUsersManager.getUserInput(userID),
            fwd_limit: 100
        }).then(function (updates) {
            _ApiUpdatesManager.processUpdateMessage(updates);
        });
    }

    function getChatLink(chatID) {
        return _AppProfileManager.getChatInviteLink(chatID);
    }

    function updateUsername(username) {
        return _MtpApiManager.invokeApi('account.updateUsername', {
            username: username || ''
        }).then(function (user) {
            _AppUsersManager.saveApiUser(user);
        });
    }

    function getUserInfo() {
        return _MtpApiManager.getUserID().then(function (id) {
            return userAuthPromise.then(function () {
                return _AppUsersManager.getUser(id);
            })
        });
    }

    function updateProfile(first_name, last_name) {
        return _MtpApiManager.invokeApi('account.updateProfile', {
            first_name: first_name || '',
            last_name: last_name || ''
        }).then(function (user) {
            _AppUsersManager.saveApiUser(user);
        });
    }

    function getUserPhoto() {
        var deferred = $.Deferred();

        getUserInfo().then(function (user) {
            if (user.photo) {
                _AppPhotosManager.preloadPhoto(user.photo.photo_id).then(function () {
                    var fileName = _MtpApiFileManager.getFileName(user.photo.photo_big);
                    var result = 'filesystem:' + window.location.origin + '/temporary/' + fileName;
                    // TODO
                    deferred.resolve(result);
                });
            } else {
                deferred.resolve('');
            }
        });

        return deferred.promise();
    }

    function updateProfilePhoto(photo) {
        if (!photo || !photo.type || photo.type.indexOf('image') !== 0) {
            return;
        }

        return _MtpApiFileManager.uploadFile(photo).then(function (inputFile) {
            _MtpApiManager.invokeApi('photos.uploadProfilePhoto', {
                file: inputFile,
                caption: '',
                geo_point: {_: 'inputGeoPointEmpty'},
                crop: {_: 'inputPhotoCropAuto'}
            }).then(function (updateResult) {
                _AppUsersManager.saveApiUsers(updateResult.users);
                _MtpApiManager.getUserID().then(function (id) {
                    _AppPhotosManager.savePhoto(updateResult.photo, {
                        user_id: id
                    });
                    _ApiUpdatesManager.processUpdateMessage({
                        _: 'updateShort',
                        update: {
                            _: 'updateUserPhoto',
                            user_id: id,
                            date: tsNow(true),
                            photo: _AppUsersManager.getUser(id).photo,
                            previous: true
                        }
                    });
                });
            });
        });
    }

    function logOut() {
        return _MtpApiManager.logOut();
    }

    function createChannel(title, about) {
        return _MtpApiManager.invokeApi('channels.createChannel', {
            title: title || '',
            flags: 0,
            about: about || ''
        }, options);
    }

    function inviteToChannel() {

    }

    /* Private Functions */

    function _saveUserInfo() {
        var deferred = $.Deferred();

        _MtpApiManager.invokeApi('users.getFullUser', {
            id: {_: 'inputUserSelf'}
        }).then(function (userFullResult) {
            _AppUsersManager.saveApiUser(userFullResult.user);
            _AppPhotosManager.savePhoto(userFullResult.profile_photo, {
                user_id: userFullResult.user.id
            });
            deferred.resolve();
        });

        return deferred.promise();
    }
})();