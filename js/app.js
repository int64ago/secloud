var app = angular.module('SECloud', ['ui.bootstrap', 'angular-md5']);

app.controller('SECloudCtrl', function ($scope, $rootScope, $http, $filter, $modal, $interval, md5) {
    var Utils = {
        folderTemplate: '\
	        <div class="modal-body" style="padding-bottom: 0px;">\
	            <input type="text" class="form-control" ng-model="folderName">\
	            <span class="err-hint font-chinese" ng-bind="isFolderNameAvaliable()" ng-hide="isFolderNameAvaliable() == \'OK\'"></span>\
	        </div>\
	        <div class="modal-footer">\
	            <button class="btn btn-primary" ng-click="ok()" ng-disabled="isFolderNameAvaliable() != \'OK\'">确定</button>\
	            <button class="btn btn-warning" ng-click="cancel()">取消</button>\
	        </div>',
        renameTemplate: '\
            <div class="modal-body" style="padding-bottom: 0px;">\
                <input type="text" class="form-control" ng-model="fileName">\
                <span class="err-hint font-chinese" ng-bind="isFileNameAvaliable()" ng-hide="isFileNameAvaliable() == \'OK\'"></span>\
            </div>\
            <div class="modal-footer">\
                <button class="btn btn-primary" ng-click="ok()" ng-disabled="isFileNameAvaliable() != \'OK\'">确定</button>\
                <button class="btn btn-warning" ng-click="cancel()">取消</button>\
            </div>',
        deleteWarningTemplate: '\
	        <div class="modal-body" style="padding-bottom: 0px;">\
	            <span class="font-chinese">[ {{delteFileName}} ]</span> </br>\
	            <span class="font-chinese">将被删除</span>\
	        </div>\
	        <div class="modal-footer">\
	            <button class="btn btn-primary" ng-click="ok()">确定</button>\
	            <button class="btn btn-warning" ng-click="cancel()">取消</button>\
	        </div>',
        typeIcon: {
            'folder': 'fa fa-folder',
                'zip': 'fa fa-file-archive-o',
                'rar': 'fa fa-file-archive-o',
                'gz': 'fa fa-file-archive-o',
                'txt': 'fa fa-file-text-o',
                'doc': 'fa fa-file-word-o',
                'docx': 'fa fa-file-word-o',
                'ppt': 'fa fa-file-powerpoint-o',
                'pptx': 'fa fa-file-powerpoint-o',
                'xls': 'fa fa-file-excel-o',
                'xlsx': 'fa fa-file-excel-o',
                'pdf': 'fa fa-file-pdf-o',
                'mp3': 'fa fa-file-audio-o',
                'jpg': 'fa fa-file-image-o',
                'jpeg': 'fa fa-file-image-o',
                'bmp': 'fa fa-file-image-o',
                'png': 'fa fa-file-image-o',
                'gif': 'fa fa-file-image-o',
                'py': 'fa fa-file-code-o',
                'js': 'fa fa-file-code-o',
                'c': 'fa fa-file-code-o',
                'cpp': 'fa fa-file-code-o',
                'html': 'fa fa-file-code-o',
                'unknown': 'fa fa-file-o'
        }
    };

    $scope.Config = {
        domain: localStorage.domain || '',
        secKey: '',
        isLogin: true
    };

    $rootScope.globalConfig = {
        uploadToken: '',
        downloadUrl: '',
        loading: false,
        uploadOK: false,
        uploadFaild: false,
        withEnc: false,
        refresh: function () {
            $scope.FileList.refresh()
        },
        getPrefix: function () {
            return $scope.FilePath.getPrefix();
        },
        isFileExist: function (fileName) {
            for (var key in $scope.FileList.list) {
                if ($scope.FileList.list[key]['name'] == fileName && $scope.FileList.list[key]['size'] != '-') return true;
            }
            return false;
        }
    };

    $scope.NetUtils = {
        isDownloading: false,
        firstUser: false,
        fetchFiles: function (callback) {
            $scope.FileList.qnFiles = [];
            $http.jsonp('http://' + $scope.Config.domain + '/list?callback=JSON_CALLBACK').
            success(function (data) {
                $scope.FileList.qnFiles = data;
                $scope.NetUtils.firstUser = data[0]?false:true;
                callback();
            }).
            error(function () {
                $scope.Config.isLogin = false;
                sessionStorage.secKey = '';
                $scope.Config.secKey = '';
            });
        },
        login: function () {
            $http.post('http://' + $scope.Config.domain + '/login', {
                passwd: md5.createHash($scope.Config.secKey)
            }, {
                withCredentials: true
            }).success(function (data) {
                localStorage.domain = $scope.Config.domain;
                $scope.NetUtils.fetchFiles(function () {
                    $scope.FileList.getFileListWithPrefix($scope.FilePath.getPrefix());
                });
                $scope.Config.isLogin = true;
                sessionStorage.secKey = $scope.Config.secKey;
            }).error(function () {
                alert('认证失败');
            });
        },
        logout: function () {
            $http.post('http://' + $scope.Config.domain + '/logout', {
                action: 'logout'
            }, {
                withCredentials: true
            }).
            success(function (data) {
                $scope.NetUtils.fetchFiles(function () {
                    $scope.FileList.getFileListWithPrefix($scope.FilePath.getPrefix());
                });
            });
        },
        getUploadToken: function () {
            $http.jsonp('http://' + $scope.Config.domain + '/uptoken?callback=JSON_CALLBACK').
            success(function (data) {
                $rootScope.globalConfig.uploadToken = data.upToken;
            }).error(function () {
                console.log('Get uploadToken err!');
            });
        },
        getDownloadUrl: function (key) {
            if (!key) return;
            var keyString = $scope.FilePath.getPrefix() + key.name;
            if (key.encrypted) keyString += '@SECloud';
            $http.jsonp('http://' + $scope.Config.domain + '/downloadurl?key=' + keyString + '&&callback=JSON_CALLBACK').
            success(function (data) {
                $rootScope.globalConfig.downloadUrl = data.downloadUrl;
            }).error(function () {
                console.log('Get downloadUrl err!');
            });
        },
        deleteFile: function (key) {
            if (!key) return;
            var keyString = $scope.FilePath.getPrefix() + key.name;
            keyString += key.encrypted ? '@SECloud' : '';
            $http.post('http://' + $scope.Config.domain + '/delete', {
                key: keyString
            }, {
                withCredentials: true
            }).
            success(function (data) {
                console.log('Delete file: ' + keyString);
                $scope.FileList.refresh();
            }).error(function () {
                console.log('Delete file err!');
            });
        },
        renameFile: function (key, newFilename) {
            if (!key) return;
            var keySrc = $scope.FilePath.getPrefix() + key.name;
            var keyDest = $scope.FilePath.getPrefix() + newFilename;
            keySrc += key.encrypted ? '@SECloud' : '';
            keyDest += key.encrypted ? '@SECloud' : '';
            $http.post('http://' + $scope.Config.domain + '/move', {
                keySrc: keySrc,
                keyDest: keyDest
            }, {
                withCredentials: true
            }).
            success(function (data) {
                console.log('Rename file: ' + keySrc);
                $scope.FileList.refresh();
            }).error(function () {
                console.log('Rename file err!');
            });
        },
        downloadFile: function () {
            //TODO: Exception handling
            $scope.NetUtils.isDownloading = true;
            $http.get($rootScope.globalConfig.downloadUrl).then(function (data) {
                if (!sessionStorage.secKey) {
                    $scope.NetUtils.isDownloading = false;
                    alert('安全密钥无效！请重新登录');
                    return;
                }
                var decrypted = CryptoJS.AES.decrypt(data.data, sessionStorage.secKey);
                var latinString = decrypted.toString(CryptoJS.enc.Latin1);
                var bytes = new Uint8Array(latinString.length);
                for (var i = 0; i < latinString.length; i++){
                	bytes[i] = latinString.charCodeAt(i);
            	}
                var blob = new Blob([bytes], {
                    type: "application/octet-binary"
                });
                var url = window.URL.createObjectURL(blob);
                var a = document.createElement("a");
                document.body.appendChild(a);
                a.style = "display: none";
                a.href = url;
                a.download = $scope.FileList.curChecked.name;
                a.click();
                window.URL.revokeObjectURL(url);
                $scope.NetUtils.isDownloading = false;
                //TODO: Delete node after downloading?
            });
        }
    };

    $scope.FilePath = {
        paths: [{
            name: '我的网盘'
        }],
        getPrefix: function () {
            var pathPrefix = '';
            for (var idx in $scope.FilePath.paths) {
                if (idx > 0) pathPrefix += $scope.FilePath.paths[idx].name + '/';
            }
            return pathPrefix;
        },
        gotoFolder: function ($index) {
            var pops = $scope.FilePath.paths.length - $index - 1;
            while (pops--) {
                $scope.FilePath.paths.pop();
            }
        },
        addFolder: function () {
            var modalInstance = $modal.open({
                template: Utils.folderTemplate,
                controller: 'FolerInputCtrl',
                size: 'sm',
                resolve: {
                    fileList: function () {
                        return $scope.FileList.list;
                    }
                }
            });
            modalInstance.result.then(function (folderNameInput) {
                $scope.FilePath.paths.push({
                    name: folderNameInput
                });
            });
        }
    };

    $scope.FileList = {
        qnFiles: [],
        list: [],
        getFileListWithPrefix: function (prefix) {
            $scope.FileList.list = [];
            var dirSet = {}
            var files = [];
            for (var key in $scope.FileList.qnFiles) {
                var curFile = $scope.FileList.qnFiles[key];
                var curFileName = curFile['name'];
                if (!curFileName.match(prefix)) continue;
                var fileName = curFileName.substring(prefix.length);
                var suffix = fileName.split('/')[0];
                var fileInfo = {};
                if (suffix == fileName) {
                    fileInfo = JSON.parse(JSON.stringify(curFile));
                    if (fileName.split('@').pop() == 'SECloud') {
                        fileInfo['encrypted'] = true;
                        fileInfo['name'] = fileName.substring(0, fileName.length - '@SECloud'.length);
                    } else {
                        fileInfo['encrypted'] = false;
                        fileInfo['name'] = fileName;
                    }
                    fileInfo['time'] = $filter('date')(fileInfo['time'] / 10000, 'yyyy-MM-dd HH:mm:ss');
                    if (parseInt(fileInfo['size'] / 1024) == 0) {
                        fileInfo['size'] = fileInfo['size'] + 'B';
                    } else if (parseInt(fileInfo['size'] / (1024 * 1024)) == 0) {
                        fileInfo['size'] = parseInt(fileInfo['size'] / 1024) + 'KB';
                    } else if (parseInt(fileInfo['size'] / (1024 * 1024 * 1024)) == 0) {
                        fileInfo['size'] = parseInt(fileInfo['size'] / (1024 * 1024)) + 'MB';
                    } else {
                        fileInfo['size'] = parseInt(fileInfo['size'] / (1024 * 1024 * 1024)) + 'GB';
                    }
                    fileInfo['checked'] = false;
                    files.push(fileInfo);
                } else if (!dirSet[suffix]) {
                    fileInfo = JSON.parse(JSON.stringify(curFile));
                    fileInfo['encrypted'] = false;
                    fileInfo['name'] = suffix;
                    fileInfo['size'] = '-';
                    fileInfo['time'] = '-';
                    fileInfo['checked'] = false;
                    dirSet[suffix] = true;
                    files.push(fileInfo);
                }
            }
            $scope.FileList.list = files;
        },
        getFileIcon: function (fileInfo) {
            var suffix = fileInfo['name'].split(".").pop().toLowerCase();
            if (fileInfo['size'] == '-') {
                return Utils.typeIcon['folder'];
            } else {
                if (suffix in Utils.typeIcon && fileInfo['name'].length - suffix.length > 1) {
                   return Utils.typeIcon[suffix];
                }
            }
            return Utils.typeIcon['unknown'];
        },
        curChecked: null,
        updateCheck: function (file) {
            if (file.size == '-') {
                $scope.FileList.curChecked = null;
                $scope.FilePath.paths.push({
                    name: file.name
                });
                return;
            }
            if (file.checked) {
                $scope.FileList.curChecked = null;
                file.checked = false;
            } else {
                for (var key in $scope.FileList.list)
                $scope.FileList.list[key].checked = false;
                $scope.FileList.curChecked = file;
                file.checked = true;
            }
        },
        refresh: function () {
            $scope.NetUtils.fetchFiles(function () {
                $scope.FileList.getFileListWithPrefix($scope.FilePath.getPrefix());
                $scope.FileList.curChecked = null;
            });
        },
        deleteFile: function (key) {
            var modalInstance = $modal.open({
                template: Utils.deleteWarningTemplate,
                controller: 'DeleteWarningCtrl',
                size: 'sm',
                resolve: {
                    delteFileName: function () {
                        return $scope.FileList.curChecked.name;
                    }
                }
            });
            modalInstance.result.then(function () {
                $scope.NetUtils.deleteFile(key);
            });
        },
        renameFile: function (key) {
            var modalInstance = $modal.open({
                template: Utils.renameTemplate,
                controller: 'RenameCtrl',
                size: 'sm',
                resolve: {
                    fileList: function () {
                        return $scope.FileList.list;
                    },
                    curFileName: function () {
                        return key.name;
                    }
                }
            });
            modalInstance.result.then(function (fileNameInput) {
                $scope.NetUtils.renameFile(key, fileNameInput)
            });
        }
    };

    $scope.Action = {
        counts: 0,
        reset: function () {
            $scope.Action.counts = 0;
        },
        check: function () {
            $interval(function () {
                if ($scope.Config.isLogin) {
                    if ($scope.Action.counts > 10 * 60 / 5) {
                        $scope.Action.counts = 0;
                        $scope.NetUtils.logout();
                    } else {
                        $scope.Action.counts++;
                    }
                }
            }, 5000);
        }
    }

    $scope.$watch('FilePath.paths', function () {
        $scope.FileList.getFileListWithPrefix($scope.FilePath.getPrefix());
    }, true);

    (function init() {
        $scope.NetUtils.fetchFiles(function () {
            $scope.FileList.getFileListWithPrefix($scope.FilePath.getPrefix());
        });
        $scope.Action.check();
    })();
});

app.controller('FolerInputCtrl', function ($scope, $modalInstance, fileList) {
    $scope.folderName = '';
    $scope.isFolderNameAvaliable = function () {
        if ($scope.folderName == '') return '请输入文件夹名';
        if ($scope.folderName.match(/\//g)) return "不能包含字符'/'"
        for (var key in fileList)
        if (fileList[key]['name'] == $scope.folderName && fileList[key]['size'] == '-') return '此文件夹已存在';
        return 'OK';
    };
    $scope.ok = function () {
        $modalInstance.close($scope.folderName);
    };
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
});

app.controller('RenameCtrl', function ($scope, $modalInstance, fileList, curFileName) {
    $scope.fileName = curFileName;
    $scope.isFileNameAvaliable = function () {
        if ($scope.fileName == '') return '请输入新文件名';
        if ($scope.fileName.match(/\//g)) return "不能包含字符'/'"
        for (var key in fileList) {
            if (fileList[key]['name'] == $scope.fileName && fileList[key]['size'] != '-' && $scope.fileName != curFileName) {
                return '此文件已存在';
            }
        }
        return 'OK';
    };
    $scope.ok = function () {
        if ($scope.fileName == curFileName) {
            $modalInstance.dismiss('cancel');
        } else {
            $modalInstance.close($scope.fileName);
        }
    };
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
});

app.controller('DeleteWarningCtrl', function ($scope, $modalInstance, delteFileName) {
    $scope.delteFileName = delteFileName;
    $scope.ok = function () {
        $modalInstance.close();
    };
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
});

app.directive('ngFileSelect', ['$rootScope', '$http', '$timeout', function ($rootScope, $http, $timeout) {
    return function (scope, ele, attr) {
        ele.bind('click', function (e) {
            ele.children()[1].value = "";
        });
        ele.bind('change', function (e) {
            var file = e.target.files[0];
            if (file == undefined) {
                console.log('no file');
                return false;
            }
            var fileName = file.name;
            var insIndex = file.name.length;
            for (var i = 0; i < file.name.length; ++i) {
                if (file.name[i] == '.')
                    insIndex = i;
            }
            for (var i = 1; $rootScope.globalConfig.isFileExist(fileName); ++i) {
                fileName = file.name.substring(0, insIndex) + '(' + i + ')' + file.name.substring(insIndex);
            }
            if ($rootScope.globalConfig.withEnc) {
                if (!sessionStorage.secKey) {
                    alert('安全密钥无效！请重新登录');
                    return;
                }
                var fileReader = new FileReader();
                $rootScope.globalConfig.loading = true;
                fileReader.onload = function () {
                    var wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(this.result));
                    var encrypted = CryptoJS.AES.encrypt(wordArray, sessionStorage.secKey);
                    //TODO: Uploading binary stream insted of Base64 string
                    var blob = new Blob([encrypted], {
                        type: "application/octet-binary"
                    });
                    var form = new FormData();
                    form.append('token', $rootScope.globalConfig.uploadToken);
                    form.append('key', $rootScope.globalConfig.getPrefix() + fileName + '@SECloud');
                    form.append("file", blob);
                    $http.post('http://up.qiniu.com', form, {
                        transformRequest: angular.identity,
                        headers: {
                            'Content-Type': undefined
                        }
                    }).success(function (data) {
                        $rootScope.globalConfig.loading = false;
                        $rootScope.globalConfig.uploadOK = true;
                        $rootScope.globalConfig.refresh();
                        $timeout(function () {
                            $rootScope.globalConfig.uploadOK = false;
                        }, 3000);
                    }).error(function () {
                        $rootScope.globalConfig.loading = false;
                        $rootScope.globalConfig.uploadFaild = true;
                        $timeout(function () {
                            $rootScope.globalConfig.uploadFaild = false;
                        }, 3000);
                    });
                };
                fileReader.readAsArrayBuffer(file);
            } else {
                $rootScope.globalConfig.loading = true;
                var form = new FormData();
                form.append('token', $rootScope.globalConfig.uploadToken);
                form.append('key', $rootScope.globalConfig.getPrefix() + fileName);
                form.append("file", file);
                $http.post('http://up.qiniu.com', form, {
                    transformRequest: angular.identity,
                    headers: {
                        'Content-Type': undefined
                    }
                }).success(function (data) {
                    $rootScope.globalConfig.loading = false;
                    $rootScope.globalConfig.uploadOK = true;
                    $rootScope.globalConfig.refresh();
                    $timeout(function () {
                        $rootScope.globalConfig.uploadOK = false;
                    }, 3000);
                }).error(function () {
                    $rootScope.globalConfig.loading = false;
                    $rootScope.globalConfig.uploadFaild = true;
                    $timeout(function () {
                        $rootScope.globalConfig.uploadFaild = false;
                    }, 3000);
                });
            }
        });
    };
}]);