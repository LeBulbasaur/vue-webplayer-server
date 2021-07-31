const http = require("http");
const fs = require("fs");
const path = require("path");
const qs = require("querystring");
const Datastore = require("nedb");
const formidable = require("formidable")
const coll = new Datastore({
    filename: path.join(__dirname, "collections/playlists.db"),
    autoload: true
});
const server = http.createServer((req, res) => {
    console.log("request made" + decodeURI(req.url));
    if (req.method == "GET") {
        if (req.url == "/admin") {
            const file = fs.readFileSync(path.join(__dirname, "static/index.html"))
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" });
            res.end(file)
        }
        else if (req.url == "/files") {
            const fileList = [];
            async function getData() {
                fs.readdirSync(path.join(__dirname, "static/mp3")).forEach(fileName => {
                    const files = fs.readdirSync(path.join(__dirname, "static/mp3", fileName));
                    const songs = [];
                    for (let i = 0; i < files.length; i++) {
                        const song = files[i].slice(-3);
                        if (song == "mp3") {
                            const stats = fs.statSync(path.join(__dirname, "static/mp3", fileName, files[i]));
                            const size = `${Math.round(stats.size / 10000) / 100}MB`;
                            songs.push({ song: files[i], size: size, album: fileName })
                        }
                    }
                    const musicAlbum = {
                        name: fileName,
                        songs: songs,
                    }
                    fileList.push(musicAlbum);
                })
            }
            getData().then(() => {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" });
                res.end(JSON.stringify(fileList))
            })
        }
        else if (req.url == "/dirs") {
            const dirsArray = [];
            async function getData() {
                fs.readdirSync(path.join(__dirname, "static/mp3")).forEach(fileName => {
                    dirsArray.push(fileName);
                })
            }
            getData().then(() => {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" });
                res.end(JSON.stringify(dirsArray));
            })
        } else if (req.url.indexOf(".mp3") != -1) {
            const getURL = decodeURI(req.url).split("/");
            fs.readFile(path.join(__dirname, "static/mp3", getURL[1], getURL[2]), (err, data) => {
                if (err) {
                    console.log(err);
                } else {
                    const file = fs.statSync(path.join(__dirname, "static/mp3", getURL[1], getURL[2]));
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.writeHead(200, {
                        "Content-type": "audio/mpeg", "Content-Length": file.size,
                        "Accept-Ranges": "bytes"
                    });
                    res.end(data);
                }
            })
        } else if (req.url.indexOf(".jpg") != -1) {
            const getURL = decodeURI(req.url).split("/");
            fs.stat(path.join(__dirname, "static/mp3", getURL[1], "cover.jpg"), (err, data) => {
                if (err == null) {
                    fs.readFile(path.join(__dirname, "static/mp3", getURL[1], "cover.jpg"), (err, data) => {
                        if (err) {
                            console.log(err);
                        } else {
                            res.setHeader("Access-Control-Allow-Origin", "*");
                            res.writeHead(200, { "Content-type": "image/jpeg" });
                            res.end(data);
                        }
                    })
                } else {
                    fs.readFile(path.join(__dirname, "static/cover.jpg"), (err, data) => {
                        if (err) {
                            console.log(err);
                        } else {
                            res.setHeader("Access-Control-Allow-Origin", "*");
                            res.writeHead(200, { "Content-type": "image/jpeg" });
                            res.end(data);
                        }
                    })
                }
            })

        }
        else if (req.url == "/playlist") {
            coll.find({}, (err, docs) => {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" });
                res.end(JSON.stringify(docs));
            });
        }
    } else {
        if (req.url == "/add-song") {
            function servResponse(req, res) {
                let allData = "";
                req.on("data", function (data) {
                    allData += data;
                })
                req.on("end", function (data) {
                    const object = JSON.parse(allData)
                    if (Object.keys(object).length > 1) {
                        coll.find({}, function (err, docs) {
                            let noRepeat = true;
                            for (let i = 0; i < docs.length; i++) {
                                if (docs[i].title.song == object.title.song && docs[i].album == object.album) {
                                    noRepeat = false;
                                }
                            }
                            console.log(object)
                            if (noRepeat == true) {
                                coll.insert(object, (err, newDoc) => {
                                    if (err) {
                                        console.log(err);
                                    }
                                })
                            }
                        });
                        coll.loadDatabase();
                    }
                })
            }

            res.end(servResponse(req, res));
        } else if (req.url == "/add-files") {
            const d = new Date();
            const randomName = d.getTime();
            const dir = `./static/mp3/${randomName}`;
            fs.mkdirSync(dir);

            let form = formidable({})
            form.uploadDir = dir
            form.keepExtensions = true

            form.on('file', function (field, file) {
                fs.rename(file.path, path.join(dir, file.name), function (err) {
                    if (err) {
                        console.log(err)
                    }
                });
            })
            form.parse(req, function (err, fields, files) {
                res.end();
            });
        }
    }
});

server.listen(3000, "localhost", () => {
    console.log("listening to 3000");
})