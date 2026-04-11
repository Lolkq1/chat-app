require('dotenv').config()
const express = require('express')
const path = require('path')
const mysql = require('mysql2/promise')
const app = express()
const { Server } = require('socket.io')
const { createServer } = require('http')
const server = createServer(app)
const io = new Server(server, {
    cookie: true
})
const bcrypt = require('bcrypt')
const cookie_parser = require('cookie-parser')
const jwt = require('jsonwebtoken')
let provisorio = 'mcqueenversustheflashquemganha'

// CREATE TABLE usuarios (id BIGINT PRIMARY KEY AUTO_INCREMENT, email VARCHAR(255) UNIQUE NOT NULL, nome VARCHAR(30) NOT NULL, senha VARCHAR(255) NOT NULL);
async function e() {
    // let conn = await con
    const con = mysql.createConnection({
    user: process.env.USER,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: 3306
    })
    app.use(express.json())
    app.use(cookie_parser())
    app.use(async (req, res, next) => {
     switch (req.url) {
        case '/index.html':
        case '/':
            if (req.cookies.sessionToken) {
                console.log('tem sessiontoken')
                try {
                    let k = jwt.verify(req.cookies.sessionToken, provisorio)
                    let conn = await con
                    let a = await conn.query('SELECT * FROM usuarios WHERE id=? AND email=?', [k.id, k.email])
                    if (a[0].length === 0) {
                        return res.status(401).send('Usuário inexistente.')
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
     return res.status(401).send('Não autorizado.')
})

app.get('/perfil/:id', (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'perfil.html'))
})
app.get('/perfil/public/:id', (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', req.params.id))
})
app.use(express.static(path.join(__dirname, 'public')))

app.post('/criar', async (req, res) => {
    const {nome, email, senha} = req.body
    if (nome.length > 30 || nome.length === 0 || email.indexOf("@") === -1 || email.indexOf(".") === -1) {
        return res.status(422).send('nome de usuário ou e-mail inválidos.')
    } else {
        let conn = await con
        try {
            let a = await conn.query('SELECT * FROM usuarios WHERE email=?', [email])
            if (a[0].length > 0) {
                return res.status(422).send('esse e-mail já pertence a uma conta.')
            }
        } catch(err) {
            console.log(err)
            return res.status(500).send('erro interno do servidor.')
        }
        try { 
            conn.beginTransaction()
            let senha2 = await bcrypt.hash(senha, 10)
            let a = await conn.query('INSERT INTO usuarios (nome, email, senha) VALUES (?,?,?)', [nome, email, senha2])
            await conn.query('INSERT INTO sessoes_socket (usuario) VALUES (?)', [email]) // token de sesao pode ser nulo. (pq o usuario ainda nao se conectou)
            console.log(a)
            res.cookie('sessionToken', jwt.sign({
                id: a[0].insertId,
                email: email
            }, provisorio), {
                maxAge:1000*60*60*24,
                httpOnly: true,
                sameSite: "strict"
            })
            conn.commit()
            return res.send("Usuário criado com sucesso.")
        } catch(err) {
            console.log(err)
            conn.rollback()
        return res.status(500).send('erro interno do servidor.')
        }
    }
})

app.post('/login', async (req, res) => {
    const {email, senha} = req.body
    try {
        let conn = await con
        let a = await conn.query('SELECT * FROM usuarios WHERE email=?', [email])
        if (a[0].length === 0) {
            return res.status(422).send('usuário inexistente.')
        } else {
            let a2 = await bcrypt.compare(senha, a[0][0].senha)
            if (a2) {
                res.cookie('sessionToken', jwt.sign({
                id: a[0][0].id,
                email: email
            }, provisorio), {
                maxAge:1000*60*60*24,
                httpOnly: true,
                sameSite: "strict"
            })
            return res.send('Acesso autorizado!')
            } else {
               return res.status(401).send('senha incorreta.')
            }
        }
    } catch(err) {
        return res.status(500).send('erro interno do servidor.')
    }
})

app.post('/newchat/:id', async (req, res) => {
        let conn = await con
    try {
        // verificar de novo pq vai que so fez a request sem passar pela 1° verificaçao (se ja existe essa dm)
        let k = jwt.verify(req.cookies.sessionToken, provisorio)
        let k2 = await conn.query('SELECT * FROM chats WHERE JSON_CONTAINS(participantes,?,?) = 1', [JSON.stringify([k.id, req.params.id])])
        if (k2[0].length > 0) {
            return res.status(401).send('Não autorizado.') 
        }
        conn.beginTransaction()
        let a = crypto.randomBytes(32)
        let b = a.toString('hex')
        await conn.query('INSERT INTO chats (token, participantes, tipo) VALUES(?,?,DM)', [b, JSON.stringify(([req.params.id])), JSON.stringify(k.id)])
        await conn.commit()
        return res.send(b)
    } catch(err) {
        console.log(err)
        await conn.rollback()
        return res.status(500).send('erro interno.')
    }
})

app.post('/message/:token', async (req, res) => {
    let conn = await con
    let e=false
    let k = jwt.verify(req.cookies.sessionToken, provisorio)
    // lembrete de verificar se o email associado à sessao socket.io é o mesmo de quem ta mandando msg pra evitar fraude de sessao
    // lembrete de registrar as rooms do socket.io tbm p cada conversa, verificar se o cara ja ta na room e emitir. Tambem, em nova conexao de cada integrante, adicioná-lo
    // às rooms as quais o id anterior
    // estava conectado. verificar se a conversa ja existe, blablabla.
            try {
                e=true
                await conn.beginTransaction()
                await conn.query('INSERT INTO mensagens (chat_token, message) VALUES (?,?)', [req.body.chat_token, req.body.msg]) // chat_token é varchar e message é text
                let a = await conn.query('SELECT JSON_CONTAINS(participantes, ?) FROM chats AS t WHERE token=?', [JSON.stringify(k.id), req.body.chat_token]) // verificacao pra ver se o usuario q fez essa request ta na conversa
                if (a[0][0].t === 1) {
                    await conn.commit()
                    return res.send('mensagem enviada com sucesso.')       
                } else {
                    await conn.rollback()
                    return res.status(403).send('Não autorizado.')
                }
            } catch(err) {
                if (e) {return res.status(401).send('Não autorizado.')} else {return res.status(500).send('Erro interno do servidor.')}
            }
    
})

app.get('/chats', async (req, res) => {
    try {
        let k = jwt.verify(req.cookies.sessionToken, provisorio)
        let conn = await con
        let a = await conn.query("SELECT * FROM chats WHERE JSON_CONTAINS(chats.participantes,?) = 1", [JSON.stringify(k.id)]) // consertar isso daq (consertei eu acho)
        return res.send(a[0])
    } catch(err) {
        console.log(err)
        return res.status(500).send('erro interno do servidor.')
    }
})

app.get('/newchat/:id', async (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'newchat.html'))
})

app.get('/chats2/:token', async (req, res) => {
    try {
        let conn = await con
        let k = jwt.verify(req.cookies.sessionToken, provisorio)
        let a = await conn.query('SELECT * FROM chats WHERE JSON_CONTAINS(chats.participantes,?) = 1 AND token=?', [JSON.stringify(k.id), req.params.token])
        if (a[0].length === 0) {
            return res.status(401).send('Usuário não participa do chat ou o chat não existe.')
        } else {
            return res.send('autorizado!')
        }
    } catch(err) {
        console.log(err)
        return res.status(500).send('erro intenro do servidor')
    }
})

app.get('/chat/:token', (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', '/chat.html'))
})

app.get('/chat/public/:id', (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', req.params.id))
})

io.on('connection', async (socket) => {
    socket.on('message', (message) => {
        //receber .msg e .room onde .room é o token
        console.log(message)
        console.log(message.msg)
        io.to(message.room).emit('message', message.msg)
    })
    socket.on('novo', (salas) => {
        socket.join(salas)
    })
})

app.patch('/socket', async (req, res) => {
    try {
        let k = jwt.verify(req.cookies.sessionToken)
        let conn = await con
        await conn.query('UPDATE sessoes_socket SET token=? WHERE email=?', [req.cookies.io, k.email])
        let a = await conn.query('SELECT chat_token FROM chats AS token WHERE JSON_CONTAINS(participantes, ?) = 1', [JSON.stringify(k.id)])
        return res.send(a[0]) // o front vai receber um 200 OK e ai vai ja mandar um evento chamado 'novo' e conectar o novo socket a cada uma das salas.
    } catch(err) {
         return res.status(500).send('erro interno do servidor.')   
    }

}) // isso aqui é muito imprático e em larga escala horrivel mas como ainda nao sei react pra fazer SPA (unica soluçao viavel
// que eu achei pq as outras nao entendi direito) pra n ter que mudar o .io toda hora vai assim por enquanto



app.get('/verificacao_ec', async (req, res) => {
    let conn = await con
    try {
        let b = parseInt(req.query.id)
        if (Number.isNaN(b)) {
            return res.status(500).send('erro interno.')
        }
        let k = jwt.verify(req.cookies.sessionToken, provisorio)
        let a =await conn.query('SELECT * FROM chats WHERE JSON_CONTAINS(participantes, ?) = 1 AND tipo="DM"', [JSON.stringify(k.id, b)])
        if (a[0].length === 0) {
            return res.status(401).send('Não autorizado.')
        } else {
            return res.send(a[0][0].token)
        }
    } catch(err) {
        console.log(err)
        return res.status(500).send('erro')
    }
})

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