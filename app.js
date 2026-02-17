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
const con = mysql.createConnection({
    user: process.env.USER,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: 3306
})

async function e() {
    app.use(express.json())
    app.use(cookie_parser())
    app.use(async (req, res, next) => {
     switch (req.url) {
        case '/index.html':
            if (req.cookies.sessionToken) {
                console.log('tem sessiontoken')
                try {
                    let k = await jwt.verify(req.cookies.sessionToken, provisorio)
                    return next()
                } catch(err) {
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

    app.post('/criar', async (req, res) => {
        const {nome, email, senha} = req.body
        if (nome.length > 30 || email.indexOf("@") === -1 || email.indexOf(".com") === -1) {
            return res.status(422).send('nome de usuário ou e-mail inválidos.')
        } else {
            try {
                let a = await con.query('SELECT * FROM usuarios WHERE email=?', [email])
                if (a[0].length > 0) {
                    return res.status(422).send('esse e-mail já pertence a uma conta.')
                }
            } catch {
                return res.status(500).send('erro interno do servidor.')
            }
            try { 
                await con.beginTransaction()
                let senha2 = await bcrypt.hash(senha, 10)
                await con.query('INSERT INTO usuarios (nome, email, senha) VALUES (?,?,?)', [nome, email, senha2])
                await con.commit()
                res.cookie('sessionToken', jwt.sign({
                    email: email
                }, provisorio), {
                    maxAge:1000*60*60*24,
                    httpOnly: true,
                    sameSite: "strict"
                })
                res.send("Usuário criado com sucesso.")
            } catch(err) {
                console.log(err)
                await con.rollback()
                return res.status(500).send('erro interno do servidor.')
            }
        }
    })

    app.post('/login', async (req, res) => {
        const {email, senha} = req.body
        try {
            let a = await con.query('SELECT * FROM usuarios WHERE email=?', [email])
            if (a[0].length === 0) {
                return res.status(422).send('usuário inexistente.')
            } else {
                let a2 = await bcrypt.compare(senha, a[0][0].senha)
                if (a2) {
                    res.cookie('sessionToken', jwt.sign({
                    email: email
                }, provisorio), {
                    maxAge:1000*60*60*24,
                    httpOnly: true,
                    sameSite: "strict"
                })
                res.send('Acesso autorizado!')
                } else {
                    return res.status(401).send('senha incorreta.')
                }
            }
        } catch(err) {
            return res.status(500).send('erro interno do servidor.')
        }
    })

    app.post('/message', (req, res) => {
        // quem enviou, quem recebeu ou o id da conversa (tem q ver ai)
    })

io.on('connection', async (socket) => {
    // try {
    //     let a = await con.query('INSERT INTO chat_sessions (token, email)', [socket.id, ])
    // } catch {

    // }
    socket.on('message', (message) => {
        console.log(message)
        console.log(message.msg)
        io.emit('message', message.msg)

    })
})



server.listen(8080, () => {
    console.log('servidor rodando na porta 8080')
})

}

e()
