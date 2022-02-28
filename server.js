const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const fs = require('fs')
const console = require('console')

const PORT = process.env.PORT || 8080
const app = express()
const server = http.createServer(app)
const io = socketio(server);


app.use(express.static(path.join(__dirname, 'client')))


//Start Server
server.listen(PORT, () => {
    console.log(`Connection: http://${getIPv4()}:${PORT}`)
})

//MIDDLEWARE
app.use(express.json())

//ROUTES
app.post('/salt', (req, res) => {
    console.log(req.body)
    parseJSON("./data.json", (data) => {
        const salt = async () => {
            //console.log(req.body.username)
            if(isEmptyObject(req.body.username)){
                return false
            }
            for(let e of data.userdata){
                if(e.name === req.body.username){
                    return e.salt;
                }
            }
            console.time("salt")
            const newSalt = await bcrypt.genSalt()
            console.timeEnd("salt")
            console.log(newSalt)
            return newSalt
        }
        salt().then((salt) => {
            if(salt != false){
            res.status(200).send({salt: salt}) 
            }else{
                res.sendStatus(404)
            }
        })
    })
})

app.post('/login', (req, res) => {
    parseJSON("./data.json", (data) => {
        const login = () => {
            for(let e of data.userdata){
                //console.log(req.body.username, " = ", e.name)
                //console.log(req.body.password, " = ", e.password)
                if(req.body.username === e.name && req.body.password === e.password){ 
                    const token = crypto.randomBytes(64).toString("hex") 
                    let expire = Date.now()
                    expire += 300000 //60.000 = 1min
                    console.log(`[Login] ${e.name} hat sich eingelogt`)
                    e.expiration = expire
                    e.access_token = token
                    writeJSON('./data.json', data)
                    return {token: e.access_token}
                }
            }
            return false
        }
        let token = login()
        token ? res.status(200).send(token) : res.sendStatus(403)
    })
})

app.post('/authenticate', (req, res) => {
    parseJSON("./data.json", (data) => {
        const authenticate = () => {
            for(let e of data.userdata){
                if(e.access_token == req.body.access_token){
                    if(e.name == req.body.username){
                        if((e.expiration - Date.now()) >= 0){
                        console.log(`Verbleibende Zeit: ${Math.floor((e.expiration - Date.now()) / 1000)}s`)
                        return true;
                        }
                    }
                }
            }
            return false 
        }
    if(authenticate() != false){
        res.sendStatus(200)
    }else{
    res.sendStatus(401)
    }
    })
    
})

app.post('/register', (req, res) => {
    parseJSON('./data.json', (data) => {
        const searchJSONonDups = () => {
            for(let e of data.userdata){
                if(e.name === req.body.username){
                    return false
                }
            }
            return true
        }
        if(searchJSONonDups() === true){
            console.log(req.body)
            data['userdata'].push({"name":req.body.username,"salt":req.body.salt,"password":req.body.password})
            writeJSON("data.json", data)
            res.status(200).send(true)
            console.log(`[Register] User: ${req.body.username} hinzugefügt`)
        }else{
            res.sendStatus(403)
        }
    })
})
//Game Server

let players = []

io.on('connection', (socket) => {
    console.log(`[GameServer] ${socket.handshake.address}`);

    socket.on("clientJoin", (data) => {
        players.push({pos: data.pos, name: data.name})
        console.log(data.name,"added!")
        io.sockets.emit("playerJoin", data)
    })
    socket.on("clientLeave", (data) => {
        for(player of players){
            if(player.name == data.name){
                console.log(data.name,"removed!")
                //remove player in array
                io.sockets.emit("playerLeave", data)
            }
        }
    })
    socket.on("clientUpdate", (data) => {
        console.clear()
        console.log(players)
        for(player of players){
            if(player.name == data.name){
                player.pos = data.pos
            }
        }
    })


    /*
    socket.on("player", (data) => {
        const doNotDup = () => {
            if(playerData.players.length == 0) playerData.players.push({pos: [0, 0], name: data.name})
            for(player of playerData.players){
                if(player.name == data.name){
                    player.pos = data.pos
                    return
                    //console.log("user updated")
                }
            }
            playerData.players.push(data)
        }
        doNotDup()
        //console.clear()
        //console.log(playerData.players)
    })
    */
    socket.on('disconnect', () => {
      console.log('[GameServer] Client disconnected');
    });
});

setInterval(() => {
    io.sockets.emit("updatePlayers", players)
}, 2000) //1000/6




const parseJSON = (path, callback) => {
    fs.readFile(path, 'utf-8', (err, data) => {
        if(err){
            console.log(err)
            return null
            
        }else{
            try{
                const jsonData = JSON.parse(data)
                return callback(jsonData)
            }catch(err){
                console.log(err)
                return null
            }
        }
    })
}

const writeJSON = (path, data) =>{
    fs.writeFile(path, JSON.stringify(data, null, 2), (err) =>{
        if(err){
            console.log(err);
        }
    })
}

const getIPv4 = () => {
    const networks = require('os').networkInterfaces();
    //iteration durch ein komisches netzwerk objekt 
    for (var network in networks) {
        var j = networks[network]

        for (var i = 0; i < j.length; i++) {
        var q = j[i]
        if (q.family === 'IPv4' && q.address !== '127.0.0.1' && !q.internal)
            return q.address
        }
    }
    return '0.0.0.0'
}

const isEmptyObject = (obj) => !Object.keys(obj).length