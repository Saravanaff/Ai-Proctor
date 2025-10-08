import io from "socket.io";
import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';


/*  
    Access To modify this file only goes to Sriram !!!!!
*/


const sriramPort = 3001;

const init = async () => {

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    const server = createServer(app);


    const io = new Server(server, {
        transports: ["websocket", "polling"],
        cors: { origin: "*" },
    });

    let pythonSocket:any = null;

    io.on('connection', (socket : any) => {
        console.log("Client Connected")

        if(socket) { 
            socket.on("register-python",() => {
                if(socket){
                    console.log("Python Server Connected For Sriram");
                    pythonSocket = socket;
                }
            }) 

            socket.on("sriram-server",(data : any) => {
                if(pythonSocket){ 
                    pythonSocket.emit("sriram-socket",data);     
                }
            })
        }
        


    })


    server.listen(sriramPort,() => {
        console.log(`Sriram Port is Started On ${sriramPort}`);
    })

}

init();