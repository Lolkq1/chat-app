
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
const router_chat = require('./routers/chat')
const router_login = require('./routers/login')
const con = require('./database')
// CREATE TABLE usuarios (id BIGINT PRIMARY KEY AUTO_INCREMENT, email VARCHAR(255) UNIQUE NOT NULL, nome VARCHAR(30) NOT NULL, senha VARCHAR(255) NOT NULL, bio TEXT);
// CREATE TABLE chats (token VARCHAR(64) PRIMARY KEY, participantes JSON NOT NULL, tipo VARCHAR(5) NOT NULL)
// CREATE TABLE mensagens (chat_token VARCHAR(21) NOT NULL, msg TEXT NOT NULL, remetente BIGINT NOT NULL, hora DATETIME NOT NULL, FOREIGN KEY (chat_token) REFERENCES chats(token));
// CREATE TABLE sessoes_socket (token VARCHAR(20), id BIGINT, FOREIGN KEY (id) REFERENCES usuarios(id))
async function e() {
    // let conn = await con
   
    app.use(express.json())
    app.use(cookie_parser())
    
    app.use(async (req, res, next) => {
     switch (req.url) {
        case '/index.html':
        case '/':
            if (req.cookies.sessionToken) {
                console.log('tem sessiontoken')
                try {
                    let k = await jwt.verify(req.cookies.sessionToken, process.env.chave)
                    let conn = await con
                    let a = await conn.query('SELECT * FROM usuarios WHERE id=? AND email=?', [k.id, k.email])
                    if (a[0].length === 0) {
                        res.cookie('sessionToken', 'a', {
                        expires: true,
                        maxAge: 1,
                        httpOnly: true,
                        sameSite: 'strict'
                        })
                        return res.status(404).sendFile(path.join(__dirname, 'public', 'oi.html'))
                    }
                    return next()
                } catch(err) {
                    console.log(err)
                    res.cookie('sessionToken', 'a', {
                        expires: true,
                        maxAge: 1,
                        httpOnly: true,
                        sameSite: 'strict'
                    })
                    break;
                }
            }
        break;
        case '/login.html':
        case '/signup.html':
        case '/login':
        case '/criar':
            if (req.cookies.sessionToken) {
                console.log('tem sessiontoken;')
            } else {
                return next()
            }
        break;
        default:
            return next()
     }
     return res.status(401).sendFile(path.join(__dirname, 'public', 'oi.html'))
})
    app.use(express.static(path.join(__dirname, 'public')))

    console.log('teste')

    app.use('/chats', router_chat)

    app.use('/criar', router_login)
    app.use('/login', router_login)

    app.get('/perfil/:id', (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'perfil.html'))
    })
    app.get('/perfil/public/:id', (req, res) => {
        return res.sendFile(path.join(__dirname, 'public', req.params.id))
    })

    app.get('/chat/:token', (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', '/chat.html'))
    })

    app.get('/chat/public/:id', (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', req.params.id))
    })

    app.get('/newchat/:id', async (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'newchat.html'))
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
    switch (req.query.chave) {
        case 'id':
            try {
                let conn = await con
                let a = await conn.query('SELECT nome, bio FROM usuarios WHERE id=?', [req.query.id])
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
                let conn = await con
                console.log(req.query.nome)
                console.log(req.query)
                let a = await conn.query('SELECT nome, id FROM usuarios WHERE nome LIKE ?', [req.query.nome])
                console.log(a, a[0])
                return res.send(JSON.stringify(a[0]))
            } catch(err) {
                console.log(err)
                return res.status(500).send('erro interno do servidor.')
            }
            
    }
})



server.listen(8080, () => {
    console.log('servidor rodando na porta 8080')
})



}

e()

