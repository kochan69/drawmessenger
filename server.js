var http = require('http');
var connection = require('./connection');
var fs = require('fs');
const log4js = require('log4js');

log4js.configure({
    appenders : {
        access : {type : 'file', filename : 'log/access.log', pattern: '-yyyy-MM-dd'},
        socket : {type : 'file', filename : 'log/socket.log', pattern: '-yyyy-MM-dd'},
        server : {type : 'file', filename : 'log/server.log', pattern: '-yyyy-MM-dd'}
    },
    categories : {
        default : {appenders : ['access'], level : 'info'},
        socket : {appenders : ['socket'], level : 'info'},
        server : {appenders : ['server'], level : 'info'}
    }
});

const accessLog = log4js.getLogger('access');
const socketLog = log4js.getLogger('socket');
const serverLog = log4js.getLogger('server');

var server = http.createServer(function(req, res) {
    
    // access.log
    accessLog.info(req.method + " " + req.url + " " + getIpAddress(req) + " " + req.headers['user-agent'] + " " + req.headers['referer']);

    // サーブレット
    var target = '';
    if(req.url === '/favicon.ico') {
        res.writeHead(200, {
            'Content-Type': 'image/png; charset=utf-8'
            });
        var image = fs.readFileSync("./favicon.ico", "binary");
        res.end(image, "binary");
    } else if(req.url === '/') {
        // index.html
        target = './index.html';
        screen(target, res);
    } else if(req.url === '/make') {
        // make.html
        target = './make.html';
        screen(target, res);
    } else if(req.url === '/join') {
        // join.html
        target = './join.html'
        screen(target, res);
    } else if(req.url === '/help') {
        // join.html
        target = './help.html'
        screen(target, res);
    } else if(req.url === '/draw.js') {
        fs.readFile('./draw.js', 'utf-8', function(err, data) {
            res.writeHead(200, {'Content-Type' : 'text/plain'});
            res.write(data);
            res.end();
        });
    } else if(req.url === '/server') {
        // サーバ処理

        // form受信
        var data ='';
        req.on('data', function(chunk) {data += chunk})
            .on('end', function() {

                if(typeof data !== 'string') {
                    serverLog.warn('HTTP403 http body data type isnot string.');
                    res.writeHead(403, {'Content-Type' : 'text/plain'});
                    res.end();
                    return;
                }
                if(data.length > 200) {
                    serverLog.warn('HTTP403 http body data size is too long:' + data.length);
                    res.writeHead(403, {'Content-Type' : 'text/plain'});
                    res.end();
                    return;
                }
                data = decodeURIComponent(data);
                serverLog.info('HTTP body data:' + data);
        
                if(data.includes('type=make')) {
                    // room作成
                    
                    // id
                    var id = Math.floor( Math.random() * (999999 + 1 - 1) ) + 1 ;
                    var idfix = ('000000' + id).slice(-6);
                    // pw
                    var pw = '';
                    var idx = data.indexOf('pw=');
                    pw = data.slice(idx + 3);
                    // name
                    var name = '';
                    var nameIdx = data.indexOf('name=');
                    name = data.slice(nameIdx + 5);
                    var namefix = '';
                    var name2Idx = name.indexOf('&pw=');
                    namefix = name.substring(0, name2Idx);

                    serverLog.info('make id=' + idfix + ' pw=' + pw + ' name=' + namefix);

                    // db
                    var query = '';
                    if (pw != '') {
                        var query = 'insert into room values("' + idfix + '", "' + pw + '", 0, "", "")';
                    }
                    else{
                        var query = 'insert into room values("' + idfix + '", "", 0, "", "")';
                    }

                    connection.query(query, function(err) {
                        if(err) {
                            serverLog.warn(err.stack);
                            res.writeHead(200, {'Content-Type' : 'text/plain; charset=utf-8'});
                            res.write('err:' + err.stack);
                            res.end(); 
                        }
                        else
                        {
                            fs.readFile('./roomMaster.html', 'utf-8', function(err, data) {
                                res.writeHead(200, {'Content-Type' : 'text/html;charset=utf-8'});
                                dataFix = data.replace('replaceId', idfix);
                                dataFix2 = dataFix.replace('replaceId', idfix);
                                dataFix3 = dataFix2.replace('replaceLi', '<li id="myname" class="panel panel-default">' + namefix + '</li>');
                                res.write(dataFix3);
                                res.end();
                            });
                        }
                    });
                }
                else if(data.includes('type=join')) {
                    // room参加

                    // id
                    var id = '';
                    var idIdx = data.indexOf('id=');
                    id = data.slice(idIdx + 3).substr(0, 6);
                    // pw
                    var pw = '';
                    var pwIdx = data.indexOf('pw=');
                    pw = data.slice(pwIdx + 3);
                    // name
                    var name = '';
                    var nameIdx = data.indexOf('name=');
                    name = data.slice(nameIdx + 5);
                    var namefix = '';
                    var name2Idx = name.indexOf('&id=');
                    namefix = name.substring(0, name2Idx);

                    serverLog.info('join id=' + id + ' pw=' + pw + ' name=' + namefix);

                    // db
                    var query = 'select id from room where id = "' + id + '" and pw = "' + pw + '" and status = 0';

                    connection.query(query, function(err, rows) {
                        if(err) {
                            serverLog.warn(err.stack);
                            res.writeHead(200, {'Content-Type' : 'text/plain;charset=utf-8'});
                            res.write('err:' + err.stack);
                            res.end(); 
                        }
                        else if(rows.length <= 0) {
                            serverLog.info('no match room.');
                            fs.readFile('./err.html', 'utf-8', function(err, data) {
                                res.writeHead(200, {'Content-Type' : 'text/html;charset=utf-8'});
                                res.write(data);
                                res.end();
                            });
                        }
                        else
                        {
                            serverLog.info('matched room:' + rows[0].id);
                            fs.readFile('./roomSlave.html', 'utf-8', function(err, data) {
                                res.writeHead(200, {'Content-Type' : 'text/html'});
                                dataFix = data.replace('replaceId', id);
                                dataFix2 = dataFix.replace('replaceId', id);
                                dataFix3 = dataFix2.replace('replaceLi', '<li id="myname" class="panel panel-default">' + namefix + '</li>');
                                res.write(dataFix3);
                                res.end();
                            });
                        }
                    }); 
                }
                else if(data.includes('type=result')) {
                    // result

                    // id
                    var id = '';
                    var idIdx = data.indexOf('id=');
                    id = data.slice(idIdx + 3).substr(0, 6);
                    // name
                    var name = '';
                    var nameIdx = data.indexOf('name=');
                    name = data.slice(nameIdx + 5);
                    var namefix = '';
                    var name2Idx = name.indexOf('&pos=');
                    namefix = name.substring(0, name2Idx);
                    // pos
                    var pos = '';
                    var posIdx = data.indexOf('pos=');
                    pos = data.slice(posIdx + 4);

                    serverLog.info('result id=' + id + ' name=' + namefix + ' position=' + pos);

                    // checkanswer
                    answer(id, namefix, pos, res);
                }
                else if(data.includes('type=next')) {
                    // next

                    // id
                    var id = '';
                    var idIdx = data.indexOf('id=');
                    id = data.slice(idIdx + 3).substr(0, 6);
                    // name
                    var name = '';
                    var nameIdx = data.indexOf('name=');
                    name = data.slice(nameIdx + 5);
                    var namefix = '';
                    var name2Idx = name.indexOf('&pos=');
                    namefix = name.substring(0, name2Idx);

                    serverLog.info('next id=' + id + ' name=' + namefix);

                    // master
                    if(data.includes('pos=master')) {
                        updateStatusDown(id);
                        deleteAnswer(id);

                        fs.readFile('./roomMaster.html', 'utf-8', function(err, data) {
                            res.writeHead(200, {'Content-Type' : 'text/html;charset=utf-8'});
                            dataFix = data.replace('replaceId', id);
                            dataFix2 = dataFix.replace('replaceLi', '<li id="myname" class="panel panel-default">' + namefix + '</li>');
                            res.write(dataFix2);
                            res.end();
                        });
                    } 
                    else {
                        fs.readFile('./roomSlave.html', 'utf-8', function(err, data) {
                            res.writeHead(200, {'Content-Type' : 'text/html'});
                            dataFix = data.replace('replaceId', id);
                            dataFix2 = dataFix.replace('replaceLi', '<li id="myname" class="panel panel-default">' + namefix + '</li>');
                            res.write(dataFix2);
                            res.end();
                        });
                    }
                }
                else if(data.includes('type=end')) {
                    // end

                    // id
                    var id = '';
                    var idIdx = data.indexOf('id=');
                    id = data.slice(idIdx + 3).substr(0, 6);

                    serverLog.info('end id=' + id);

                    // master
                    if(data.includes('pos=master')) {
                        deleteRoom(id);
                        deleteAnswer(id);

                        target = './index.html';
                        screen(target, res);
                    } 
                    else {
                        target = './index.html';
                        screen(target, res);
                    }
                }
                else {
                    serverLog.warn('HTTP404 no html resource.');
                    res.writeHead(404, {'Content-Type' : 'text/html'});
                    res.end();
                }
                return;
            });
    }
});

function screen(target, res) {
    // 画面遷移処理
    fs.readFile(target, 'utf-8', function(err, data) {
        res.writeHead(200, {'Content-Type' : 'text/html'});
        res.write(data);
        res.end();
    })
};

function getIpAddress(request) {
    if(request.headers['x-forwarded-for']) {
        return request.headers['x-forwarded-for'];
    }
    
    if(request.connection && request.connection.remoteAddress) {
        return request.connection.remoteAddress;
    }
    
    if(request.connection.socket && request.connection.socket.remoteAddress) {
        return request.connection.socket.remoteAddress;
    }
    
    if(request.socket && request.socket.remoteAddress) {
        return request.socket.remoteAddress;
    }
    return '0.0.0.0';
}

//var io = require('socket.io').listen(server);
var io = require('socket.io')(server, {
    maxHttpBufferSize: 100000
})

io.on('connection', function(socket) {
    // 接続
    socketLog.info('Connected:' + socket.handshake.address + " " + socket.handshake.url);

    socket.on('join', function(info) {
        // ルーム参加
        usrobj = {
            'id': info.id,
            'name': info.name,
            'position': info.position
        };
        socket.join(info.id);
        socketLog.info('join:' + socket.handshake.address + " " + socket.handshake.url + " roomid:" + info.id + " name:" + info.name);

        // 参加通知（自分以外他者）
        socket.to(info.id).emit('joined', info.name);
    });

    socket.on('leave', function(info) {
        // ルーム退室
        socket.leave(info.id);
        socketLog.info('leave:' + socket.handshake.address + " " + socket.handshake.url + " roomid:" + info.id + " name:" + info.name);

        // 退室通知（自分以外他者）
        socket.to(info.id).emit('leaved', info.name);
    });

    socket.on('bcast', function(names) {
        // master>>slave展開
        socketLog.info('bcast:' + socket.handshake.address + " " + names);
        var toId = names[0];
        names.shift();
        socket.to(toId).emit('bcasted', names);
    });

    socket.on('start', function(names) {
        // ゲーム開始
        var roomid = names[0];
        names.shift();
        var mode = names[0];
        names.shift();

        start_game(roomid, mode, names);
    });

    socket.on('sendImage', function(in_info) {
        socketLog.info('sendImage:' + socket.handshake.address + " " + socket.handshake.url + " imagesize:" + in_info.image.length);

        if (in_info.seq === 0) {
            insertAnswer(in_info.id, in_info.title);
        }
        
        insertImage(in_info.id, in_info.seq, in_info.members[in_info.seq], in_info.image);

        info = {
            'id': in_info.id,
            'members': in_info.members,
            'seq': in_info.seq + 1,
            'image': in_info.image
        }

        if (info.members.length >= info.seq) {
            emit_next_game(info);
        }
    });

    socket.on('answer', function(info) {
        
        insertReply(info.id, info.title);

        emit_result(info);        
    });

    socket.on('discconect', function() {
        socketLog.info('Disconnected:' + socket.handshake.address + " " + socket.handshake.url);
    });

    socket.on('close', function() {
        socketLog.info('closed:' + socket.handshake.address + " " + socket.handshake.url);
    });
});

async function start_game(id, mode, members) {
    // membershuffle
    for(i = members.length - 1; i >0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = members[i];
        members[i] = members[j];
        members[j] = tmp;
    }

    emit_all_start_game(id, members);

    info = {
        'id': id,
        'members': members,
        'seq': '0',
        'modetitle': ''
    }

    updateStatusUp(id);

    if(mode === 'auto') {
        info.modetitle = await selectTitle();
    } 

    emit_next_game(info);
};

function emit_all_start_game(id, members) {
    // ゲーム初期状態
    io.sockets.to(id).emit('start_game', members);
};

function emit_next_game(info) {
    // 全体の状態変更
    io.sockets.to(info.id).emit('next_game', info);
};

function emit_result(info) {
    // 結果表示
    io.sockets.to(info.id).emit('result', info);
};

function selectTitle() {

    return new Promise((resolve, reject) => {
        var query = 'select title from title order by rand() limit 1';

        connection.query(query, function(err, rows) {
            if(err) {
                serverLog.warn(err.stack);
                reject(0);
            }
            else if(rows.length <= 0) {
                serverLog.warn('title not found.');
                resolve(0);
            }
            else
            {
                var result = rows[0].title;
                resolve(result);
            }
        }); 
    })
};

function updateStatusUp(id) {
    var query = 'update room set status = "1" where id = "' + id + '"';

    connection.query(query, function(err) {
        if(err) {
            serverLog.warn(err.stack);
        }
    });    
}

function updateStatusDown(id) {
    var query = 'update room set status = "0" where id = "' + id + '"';

    connection.query(query, function(err) {
        if(err) {
            serverLog.warn(err.stack);
        }
    });    
}

function deleteRoom(id) {
    var query = 'delete from room where id = "' + id + '"';

    connection.query(query, function(err) {
        if(err) {
            serverLog.warn(err.stack);
        }
    });    
}

function deleteAnswer(id) {
    var query = 'delete from answer where id = "' + id + '"';

    connection.query(query, function(err) {
        if(err) {
            serverLog.warn(err.stack);
        }
    });    
}

function insertImage(id, seq, name, image) {
    
    var query = 'insert into answer values("' + id + '", "' + seq + '", "' + name + '", "' + image + '")';

    connection.query(query, function(err) {
        if(err) {
            serverLog.warn(err.stack);
        }
    });    
};

function selectImage(id) {

    return new Promise((resolve, reject) => {
        var query = 'select name, image from answer where id = "' + id + '" order by seq asc';

        connection.query(query, function(err, rows) {
            if(err) {
                serverLog.warn(err.stack);
                reject(0);
            }
            else if(rows.length <= 0) {
                serverLog.warn('image not found.');
                resolve(0);
            }
            else
            {
                var result = [];
                for(var i = 0; i < rows.length; i++) {
                    result.push(rows[i]);
                }
                resolve(result);
            }
        }); 
    })
};

function insertAnswer(id, answer) {
    
    var query = 'update room set answer = "' + answer + '" where id = "' + id + '"';

    connection.query(query, function(err) {
        if(err) {
            serverLog.warn(err.stack);
        }
    });    
};

function insertReply(id, reply) {
    
    var query = 'update room set reply = "' + reply + '" where id = "' + id + '"';

    connection.query(query, function(err) {
        if(err) {
            serverLog.warn(err.stack);
        }
    });    
};

function checkAnswer(id) {

    return new Promise((resolve,reject) => {
        var query = 'select answer, reply from room where id = "' + id + '"';

        var checkinfo = [];
    
        connection.query(query, function(err, rows) {
            if(err) {
                serverLog.warn(err.stack);
                checkinfo.push('9');
                reject(checkinfo);
            }
            else if(rows.length <= 0) {
                serverLog.warn('no answer.');
                checkinfo.push('9');
                resolve(checkinfo);
            }
            else
            {
                if (rows[0].reply === rows[0].answer) {
                    checkinfo.push('1');
                } else {
                    checkinfo.push('0');
                }
                checkinfo.push(rows[0].answer);
                checkinfo.push(rows[0].reply);
                serverLog.info('answer:' + rows[0].answer + ' reply:' + rows[0].reply);
                resolve(checkinfo);
            }
        }); 
    })
};

async function answer(id, name, pos, res) {
    var checkinfo = await checkAnswer(id);
    var images = await selectImage(id);
    if(images === 0) {
        checkinfo[0] = 9;
    }
    outinfo = {
        'checkinfo': checkinfo,
        'images': images
    }
    
    fs.readFile('./result.html', 'utf-8', function(err, data) {
        res.writeHead(200, {'Content-Type' : 'text/html'});
        // 結果
        if (checkinfo[0] === "0") {
            dataFix = data.replace('replaceChar', 'はずれ');
        }
        else if (checkinfo[0] === "1") {
            dataFix = data.replace('replaceChar', 'あたり！');
        } 
        else {
            dataFix = data.replace('replaceChar', 'システムエラー');
        }
        // お題
        dataFix2 = dataFix.replace('replaceTitle', checkinfo[1]);
        // 回答
        dataFix3 = dataFix2.replace('replaceReply', checkinfo[2]);
        // 一覧
        var replaceImages = '';
        for(var i = 0; i < images.length; i++) {
            replaceImages += '<li>' + images[i].name + '</li>';
            replaceImages += '<img src="' + images[i].image + '" />'
        }
        dataFix4 = dataFix3.replace('replaceImages', replaceImages);
        // ユーザ情報
        dataFix5 = dataFix4.replace('replaceid', '"' + id + '"');
        dataFix6 = dataFix5.replace('replacename', '"' + name + '"');
        dataFix7 = dataFix6.replace('replacepos', '"' + pos + '"');
        dataFix8 = dataFix7.replace('replaceid', '"' + id + '"');
        dataFix9 = dataFix8.replace('replacename', '"' + name + '"');
        dataFix10 = dataFix9.replace('replacepos', '"' + pos + '"');

        res.write(dataFix10);
        res.end();
    });
}

server.listen(80);