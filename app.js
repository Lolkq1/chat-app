require('dotenv').config()
const express = require('express')
const path = require('path')
const app = express()
const { Server } = require('socket.io')
const { createServer } = require('http')
const server = createServer(app)
const io = new Server(server, {
    cookie: true
})
const jwt = require('jsonwebtoken')
const cookie_parser = require('cookie-parser')
const router_chat = require('./routes/chat')
const router_user = require('./routes/user')
const con = require('./database')
const {auth, inverseAuth} = require('./auth')
// CREATE TABLE usuarios (id BIGINT PRIMARY KEY AUTO_INCREMENT, email VARCHAR(255) UNIQUE NOT NULL, nome VARCHAR(30) NOT NULL, senha VARCHAR(255) NOT NULL, bio TEXT);
// CREATE TABLE chats (token VARCHAR(64) PRIMARY KEY, participantes JSON NOT NULL, tipo VARCHAR(5) NOT NULL)
// CREATE TABLE mensagens (chat_token VARCHAR(21) NOT NULL, msg TEXT NOT NULL, remetente BIGINT NOT NULL, hora DATETIME NOT NULL, FOREIGN KEY (chat_token) REFERENCES chats(token));
// CREATE TABLE sessoes_socket (token VARCHAR(20), id BIGINT, FOREIGN KEY (id) REFERENCES usuarios(id))
// let conn = await con
   
app.use(express.json())
app.use(cookie_parser())

app.use(express.static(path.join(__dirname, 'public')))
app.use('/login', inverseAuth, (req, res) => {return res.sendFile(path.join(__dirname, 'public', 'login.html'))})
app.use('/signup', inverseAuth, (req, res) => {return res.sendFile(path.join(__dirname, 'public', 'signup.html'))})
app.use('/configuracoes', auth, (req, res) => {return res.sendFile(path.join(__dirname, 'reservedAuth', 'configuracoes.html'))})

app.use('/chats', auth, router_chat)

app.use('/user', router_user)

app.get('/perfil/:id', (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'perfil.html'))
})

app.get('/chat/:token', auth, (req, res) => {
    return res.sendFile(path.join(__dirname, 'reservedAuth', '/chat.html'))
})

app.get('/newchat/:id', auth, async (req, res) => {
    return res.sendFile(path.join(__dirname, 'reservedAuth', 'newchat.html'))
})
// so pra lembrar: chats2 pega um chat especifico e verifica se o user ta. chats pega todos os que o user ta. da pra juntar os 2 mas dx pra dps



io.on('connection', async (socket) => {
    socket.on('novo', (salas) => {
        socket.join(salas)
        console.log(socket.rooms)
    })
    socket.on('mensagem', (mensagem) => {
        socket.broadcast.to(mensagem.room).emit('mensagem', {msg: mensagem.msg, room: mensagem.room, emissor: mensagem.emissor})
    })
})

// isso aqui é muito imprático e em larga escala horrivel mas como ainda nao sei react pra fazer SPA (unica soluçao viavel
// que eu achei pq as outras nao entendi direito) pra n ter que mudar o .io toda hora vai assim por enquanto

app.get('/pesquisa', async (req, res) => {
    let conn = await con
    switch (req.query.chave) {
        case 'id':
            try {
                let a = await conn.query('SELECT nome, bio, email FROM usuarios WHERE id=?', [req.query.id])
                console.log(a)
                if (a[0].length === 0) {
                    return res.status(404).send('usuario nao encontrado.')
                }
                return res.send(JSON.stringify(a[0][0]))
            }
            catch(err) {
                console.log(err)
                return res.status(500).send('erro interno do servidor.')
            }
        case 'nome':
            try {
                console.log(req.query.nome)
                console.log(req.query)
                let a = await conn.query('SELECT nome, id FROM usuarios WHERE nome LIKE ?', [req.query.nome])
                console.log(a, a[0])
                return res.send(JSON.stringify(a[0]))
            } catch(err) {
                console.log(err)
                return res.status(500).send('erro interno do servidor.')
            }
        case 'dados':
            try {
                let i = await jwt.verify(req.cookies.sessionToken, process.env.chave)
                let a = await conn.query('SELECT nome,bio,email FROM usuarios WHERE id=?', [i.id])
                return res.send(JSON.stringify(a[0][0]))
            } catch(err) {
                console.log(err)
                return res.status(500).send('erro intenro do servidor.')
            }
    }
})


app.use(auth, express.static(path.join(__dirname,'reservedAuth')))

server.listen(8080, () => {
    console.log('servidor rodando na porta 8080')
})



