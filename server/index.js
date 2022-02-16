const mongoose = require('mongoose')
const documentModel = require('./models/document')

const express = require('express')
const cors = require('cors')

const INDEX = "/index.html";

const PORT = process.env.PORT || 3001
const server = express()
                .use(cors())
                .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
                .listen(PORT)

const username = process.env.DB_USER
const password = process.env.DB_PASS

mongoose.connect(
    `mongodb+srv://${username}:${password}@cluster0.tujdi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
)

const io = require("socket.io")(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
})

io.on('connection', socket => {
    socket.on('get document', async documentID =>{
        const document = await findOrCreateDocument(documentID)

        socket.join(documentID)
        socket.emit('load document', document.data)

        socket.on('send changes', delta => {
            socket.broadcast.to(documentID).emit('receive changes', delta)
        })

        socket.on('save changes', async data => {
            await documentModel.findByIdAndUpdate(documentID, {data})
        })
    })
})

async function findOrCreateDocument(id){
    if(id == null) return

    const document = await documentModel.findById(id)
    if(document) return document

    return await documentModel.create({_id: id, data: ''})
}