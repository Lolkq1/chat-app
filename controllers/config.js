const con = require('../database')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

async function padrao(propriedade, req, res) {
    let conn = await con
    try {
        let m = await jwt.verify(req.cookies.sessionToken , process.env.chave)
        let {prop, novo, senha} = req.body
        if (propriedade === 'email') {
            let a = await conn.query("SELECT * FROM usuarios WHERE email=?", [prop])
            if (a[0].length > 0) {
                return res.status(403).send('este e-mail já está em uso.')
            }
            if (prop.indexOf("@") === -1 || prop.indexOf(".") === -1) {
                console.log('formatação incorr.')
                return res.status(422).send('formatação incorreta.')
            }
        } else if (propriedade === 'nome' && (prop.length > 30 || prop.length === 0)) {
            console.log('formatação incorr.')
            return res.status(422).send('formatação incorreta.')
        }
        let m2 = await conn.query('SELECT senha FROM usuarios WHERE id=?', [m.id])
        let m3 = await bcrypt.compare(senha, m2[0][0].senha)
        if (!m3) {
            console.log('senha incorreta.')
            return res.status(401).send('não autorizado.')
        }
        if (propriedade === 'senha') {
            let a = await bcrypt.hash(prop, 10)
            prop = a
        }
        await conn.query(`UPDATE usuarios SET ${propriedade}=? WHERE id=?`, [prop, m.id])
        return res.send('nome alterado com sucesso!')
    } catch(err) {
        console.log(err)
        return res.status(500).send('Erro Interno.')
    }
}

async function mudarNome(req, res) {
    padrao('nome', req, res)
} 

async function mudarBio(req, res) {
    padrao('bio', req, res)
}

async function mudarSenha(req, res) {
    padrao('senha', req, res)
}

async function mudarEmail(req, res) {
    padrao('email', req, res)
}

module.exports = {
    mudarBio,
    mudarEmail,
    mudarNome,
    mudarSenha
}