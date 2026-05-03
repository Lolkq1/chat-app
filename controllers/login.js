require('dotenv').config() 
const con = require('../database')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

async function criar (req, res) {
    let conn = await con
    const {nome, email, senha} = req.body
    if (nome.length > 30 || nome.length === 0 || email.indexOf("@") === -1 || email.indexOf(".") === -1) {
        return res.status(400).send('nome de usuário ou e-mail inválidos.')
    } else {
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
            }, process.env.chave), {
                maxAge:1000*60*60*24,
                httpOnly: true,
                sameSite: "strict"
            })
            await conn.commit()
            return res.send("Usuário criado com sucesso.")
        } catch(err) {
            console.log(err)
            conn.rollback()
        return res.status(500).send('erro interno do servidor.')
        }
    }
}

async function login (req, res) {
    let conn = await con
    const {email, senha} = req.body
    try {
        console.log(conn)
        let a = await (await conn).query('SELECT * FROM usuarios WHERE email=?', [email])
        console.log(a)
        console.log(1)
        if (a[0].length === 0) {
            return res.status(422).send('usuário inexistente.')
        } else {
            let a2 = await bcrypt.compare(senha, a[0][0].senha)
            if (a2) {
                res.cookie('sessionToken', jwt.sign({
                id: a[0][0].id,
                email: email
            }, process.env.chave), {
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
}

module.exports = {
    criar, login
}