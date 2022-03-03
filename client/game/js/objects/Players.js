import {Box} from "./Box.js"
export class Players 
{
    constructor(socket){
        this.players = []
        this.socket = null
        socket.on("updatePlayers", (data) => {
            //console.log(data)
            this.updateVelPlayers(data)
        })
        socket.on("playerJoin", (data) => {
            console.log(data)
            this.addPlayer(data.vel, data.name)
        })
        

        
    }
    searchAdded(serverData, clientPlayers){
        if(serverData.length > clientPlayers.length){
            let output = []
            //console.log("serverData ist größer")
            let bool = false
            for(let i of serverData){
                //if(i.name == localStorage.getItem("username")) return
                //console.log(i)
                bool = false
                for(let j of clientPlayers){
                    if(i.name == j.name){
                        bool = true
                        break
                    }
                }
                if(!bool){
                    output.push(i)
                }
            }
            return output
        }else if(serverData.length < clientPlayers.length){
            console.log("spieler weniger => entferne aus Liste")
        }
    }

    addPlayer(vel, name){
        console.log(vel)
        const player = new Box({
            pos: [100, 100],
            vel: [0, 0],
            size: [50, 50],
            color: "blue",
            name: name,
            disableVel: false
        })
        this.players.push(player)
        console.log(player)
        console.log(`Player ${name} added`)
    }

    delPlayer(name){
        //mach delete xD
    }
    updateVelPlayers(data){
        if(this.players.length == data.length){
            for(let clientPlayer of this.players){
                for(let serverData of data){
                    if(clientPlayer.name == serverData.name){
                        clientPlayer.vel = serverData.vel
                        //console.log("server:", clientPlayer.vel)
                        break
                    }
                }
            }
        }
        if(this.players.length < data.length){
            this.searchAdded(data, this.players).forEach(e => {
                this.addPlayer(e.vel, e.name)
                
            })
            //this.addPlayer(this.searchAdded(data, this.players).pos, this.searchAdded(data, this.players).name)
        }
    }
    

    updatePlayers(deltaTime){
        if(this.players.length == 0){
            //console.log("no players")
            return
        } 
        //console.log(this.players)
        for(let player of this.players){
            //console.log("update:", player.name)
            player.update(deltaTime)
            player.draw()
            player.inLevelBounds()
        }
    }
}