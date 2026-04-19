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
const nanoid = require('nanoid')
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
                        res.cookie('sessionToken', 'a', {
                        expires: true,
                        maxAge: 1,
                        httpOnly: true,
                        sameSite: 'strict'
                        })
                        return res.status(404).sendFile(path.join(__dirname, 'public', 'redirect.js'))
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
     return res.status(401).sendFile(path.join(__dirname, 'public', 'redirect.js'))
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
        return res.status(400).send('nome de usuário ou e-mail inválidos.')
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
            await conn.query('INSERT INTO sessoes_socket (id) VALUES (?)', [a[0].insertId]) // token de sesao pode ser nulo. (pq o usuario ainda nao se conectou)
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
        console.log(1)
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
        console.log(err)
        return res.status(500).send('erro interno do servidor.')
    }
})

app.put('/newchat/:id', async (req, res) => {
        let conn = await con
    try {
        // verificar de novo pq vai que so fez a request sem passar pela 1° verificaçao (se ja existe essa dm)
        let k = jwt.verify(req.cookies.sessionToken, provisorio)
        if (k.id == req.params.id) {
            return res.status(400).send('não é possível criar um chat consigo mesmo.')
        }
        let k2 = await conn.query('SELECT * FROM chats WHERE JSON_CONTAINS(participantes,?) = 1 AND JSON_CONTAINS(participantes,?) = 1', [JSON.stringify(k.id), JSON.stringify(parseInt(req.params.id))])
        console.log(k2[0])
        console.log('aq nao 1')
        if (k2[0].length > 0) {
            return res.status(403).send('Não autorizado.') 
        }
        conn.beginTransaction()
        let a = nanoid.nanoid()
        await conn.query('INSERT INTO chats (token, participantes, tipo) VALUES (?,?,"DM")', [a, JSON.stringify([parseInt(req.params.id), k.id])])
        console.log('aq nao 2')
        await conn.commit()
        return res.send(a)
    } catch(err) {
        console.log(err)
        await conn.rollback()
        return res.status(500).send('erro interno.')
    }
})

app.post('/mensagem/:token', async (req, res) => {
    let conn = await con
    console.log(req.params.token)
    console.log('ola')
    let e=false
    let k = jwt.verify(req.cookies.sessionToken, provisorio)
            try {
                e=true
                await conn.beginTransaction()
                await conn.query('INSERT INTO mensagens (chat_token, msg, remetente, hora) VALUES (?,?,?, NOW())', [req.params.token, req.body.msg, k.id]) // chat_token é varchar e msg é text
                let a = await conn.query('SELECT JSON_CONTAINS(participantes, ?) AS t FROM chats WHERE token=?', [JSON.stringify(k.id), req.params.token]) // verificacao pra ver se o usuario q fez essa request ta na conversa
                if (a[0][0].t === 1) {
                    await conn.commit()
                    return res.send('mensagem enviada com sucesso.')       
                } else {
                    await conn.rollback()  
                    return res.status(403).send('Não autorizado.')
                }
            } catch(err) {
                console.log(err)
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
            return res.status(403).send('Usuário não participa do chat ou o chat não existe.')
        } else {
            return res.send('autorizado!')
        }
    } catch(err) {
        console.log(err)
        return res.status(500).send('erro intenro do servidor')
    }
})

// so pra lembrar: chats2 pega um chat especifico e verifica se o user ta. chats pega todos os que o user ta. da pra juntar os 2 mas dx pra dps

app.get('/chat/:token', (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', '/chat.html'))
})

app.get('/chat/public/:id', (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', req.params.id))
})

io.on('connection', async (socket) => {
    socket.on('mensagem', (mensagem) => {
        //receber .msg e .room onde .room é o token
        io.to(mensagem.room).emit('mensagem', mensagem.msg)
    })
    socket.on('novo', (salas) => {
        socket.join(salas)
    })
})

app.patch('/socket', async (req, res) => {
    try {
        let k = jwt.verify(req.cookies.sessionToken, provisorio)
        let conn = await con
        await conn.query('UPDATE sessoes_socket SET token=? WHERE id=?', [req.cookies.io, k.id])
        console.log(1)
        let a = await conn.query('SELECT token FROM chats WHERE JSON_CONTAINS(participantes, ?) = 1', [JSON.stringify(k.id)])
        return res.send(a[0]) // o front vai receber um 200 OK e ai vai ja mandar um evento chamado 'novo' e conectar o novo socket a cada uma das salas.
    } catch(err) {
        console.log(err)
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
        let a =await conn.query('SELECT * FROM chats WHERE JSON_CONTAINS(participantes,?) = 1 AND JSON_CONTAINS(participantes, ?) AND tipo="DM"', [JSON.stringify(parseInt(k.id)), JSON.stringify(parseInt(b))])
        if (a[0].length === 0) {
            return res.status(403).send('Não autorizado.')
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

app.get('/historico/:token', async(req, res) => {
    let conn = await con
    let k = jwt.verify(req.cookies.sessionToken, provisorio)
    let c = await conn.query('SELECT msg, remetente, hora FROM mensagens WHERE chat_token=? ORDER BY hora', [req.params.token])
    console.log(c[0])
    for (x of c[0]) {
        if (x.remetente === k.id) {
            x.eu = true
        } else {
            x.eu = false
        }
    }
    console.log(c[0][0])
    return res.send(JSON.stringify(c[0]))
})

server.listen(8080, () => {
    console.log('servidor rodando na porta 8080')
})

}

e()