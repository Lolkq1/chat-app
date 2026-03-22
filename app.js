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
                    let k = await jwt.verify(req.cookies.sessionToken, provisorio)
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

app.use(express.static(path.join(__dirname, 'public')))

app.get('/perfil/:id', (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'perfil.html'))
})

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

app.post('/message', async (req, res) => {
    let conn = await con
    let e=false
    // lembrete de verificar se o email associado à sessao socket.io é o mesmo de quem ta mandando msg pra evitar fraude de sessao
    // lembrete de registrar as rooms do socket.io tbm p cada conversa, verificar se o cara ja ta na room e emitir. Tambem, em nova conexao de cada integrante, adicioná-lo
    // às rooms as quais o id anterior
    // estava conectado. verificar se a conversa ja existe, blablabla.
    try {
        // verificaçao blablabla
        let k = await jwt.verify(req.cookies.sessionToken, provisorio)
        e=true
        await conn.beginTransaction()
        conn.query('INSERT INTO mensagens VALUES (?,?)', [req.body.chat_token, req.body.msg]) // chat_token é varchar e message é text
        let chats = await conn.query('SELECT * FROM chats WHERE chat_token=?', [req.body.chat_token])
        let a = await conn.query('SELECT JSON_CONTAINS(?, ?) FROM chats AS t', [chats[0][0].participantes, JSON.stringify(k.id)]) // verificacao pra ver se o usuario q fez essa request ta na conversa
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
        let k = await jwt.verify(req.cookies.sessionToken, provisorio)
        let conn = await con
        let a = await conn.query("SELECT * FROM chats WHERE JSON_CONTAINS(chats.participantes,?) = 1", [JSON.stringify(k.id)]) // consertar isso daq (consertei eu acho)
        return res.send(a[0])
    } catch(err) {
        console.log(err)
        return res.status(500).send('erro interno do servidor.')
    }
})


io.on('connection', async (socket) => {
    socket.on('message', (message) => {
        console.log(message)
        console.log(message.msg)
        io.emit('message', message.msg)
    })
})

app.post('/socket', async (req, res) => {
    try {
        let k = await jwt.verify(req.cookies.sessionToken)
        let conn = await con
        await conn.query('INSERT INTO sessoes_socket (token, email) VALUES (?,?)', [req.cookies.io, k.email])
        return res.send('sessão socket.io registrada.')
    } catch(err) {
         return res.status(500).send('erro interno do servidor.')   
    }

})



app.get('/verificacao_ec', async (req, res) => {
    let a = req.url.slice(parseInt(req.url.indexOf('id')))
    let b = a.split('=')
    let conn = await con
    try {
        let k = await jwt.verify(req.cookies.sessionToken, provisorio) // vou ter q me decidir se vai ser com email ou com id ou os 2 pra ficar salvo nos chat.
        await conn.query('SELECT * FROM chats WHERE JSON_CONTAINS(chats.participantes, ?) = 1 AND JSON_CONTAINS(chats.participantes, ?) = 1 AND tipo="DM"', [k.id, b[1]])
    } catch(err) {
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