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
            return res.status(201).send("Usuário criado com sucesso.")
        } catch(err) {
            console.log(err)
            await conn.rollback()
            return res.status(500).send('erro interno do servidor.')
        }
    }
}

async function login (req, res) {
    let conn = await con
    const {email, senha} = req.body
    try {
        let a = await conn.query('SELECT * FROM usuarios WHERE email=?', [email])
        if (a[0].length === 0) {
            return res.status(404).send('usuário inexistente.')
        }
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
        }
        return res.status(401).send('senha incorreta.')
    } catch(err) {
        console.log(err)
        return res.status(500).send('erro interno do servidor.')
    }
}

async function padrao(propriedade, req, res) {
    let conn = await con
    const {id} = res.locals.k
    let {prop, novo, senha} = req.body
    let m2 = await conn.query('SELECT senha FROM usuarios WHERE id=?', [id])
    let m3 = await bcrypt.compare(senha, m2[0][0].senha)
    if (!m3) {
        console.log('senha incorreta.')
        return res.status(401).send('não autorizado.')
    }
    try {
        switch(propriedade) {
            case 'email':
                let a = await conn.query("SELECT * FROM usuarios WHERE email=?", [prop])
                if (a[0].length > 0) {
                    return res.status(422).send('este e-mail já está em uso.')
                }
                if (prop.indexOf("@") === -1 || prop.indexOf(".") === -1) {
                    console.log('formatação incorr.')
                    return res.status(422).send('formatação incorreta.')
                }
            break;
            case 'nome':
                if (prop.length > 30 || prop.length === 0) {
                    console.log('formatação incorr.')
                    return res.status(422).send('formatação incorreta.')
                }
            break;
            case 'senha':
                prop = await bcrypt.hash(prop,10)
            break;
            case 'bio':

            break;
            default:
                return res.status(400).send('Parâmetros inválidos.')
        }
        await conn.query(`UPDATE usuarios SET ${propriedade}=? WHERE id=?`, [prop, id])
        return res.send('alterado com sucesso!')
    } catch(err) {
        console.log(err)
        return res.status(500).send('Erro interno do servidor.')
    }
}

async function mudar(req, res) {
    padrao(req.params.config, req, res)
}

async function logout(req, res) {
    res.clearCookie("sessionToken", {httpOnly: true, sameSite: "strict"})
    return res.send("Logout feito com sucesso!")
}

module.exports = {
    criar, 
    login, 
    mudar,
    logout
}