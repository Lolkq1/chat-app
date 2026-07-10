const con = require('./database')
const jwt = require('jsonwebtoken')
const path = require('path')


let auth = async (req, res, next) => {
    const conn = await con
    if (req.cookies.sessionToken) {
                console.log('tem sessiontoken')
                let b = false
                try {
                    console.log(req.cookies.sessionToken)
                    let k = jwt.verify(req.cookies.sessionToken, process.env.chave)
                    b = true
                    let c = await conn.query('SELECT * FROM usuarios WHERE id=? AND email=?', [k.id, k.email])
                    console.log(2)
                    if (c[0].length === 0) {
                        res.clearCookie("sessionToken", {
                            httpOnly: true,
                            sameSite: 'strict'
                        })
                        return res.status(404).sendFile(path.join(__dirname, 'public', 'redirectLogin.html'))
                    }
                    res.locals.k = {
                        id: k.id,
                        email: k.email
                    }
                    return next()
                } catch(err) {
                    console.log(err)
                    if (b) return res.status(500).send("erro interno do servidor.")
                    res.clearCookie("sessionToken", {
                        httpOnly: true,
                        sameSite: "strict"
                    })
                    return res.status(401).sendFile(path.join(__dirname, 'public', 'redirectLogin.html'))
                }
    }
    return res.status(401).sendFile(path.join(__dirname, 'public', 'redirectLogin.html'))
}

let inverseAuth = async (req, res, next) => {
    let conn = await con
    if (!req.cookies.sessionToken) return next()
    try {
        let a = jwt.verify(req.cookies.sessionToken, process.env.chave)
        let b = await conn.query("SELECT * FROM usuarios WHERE id=?", [a.id])
        if (b[0][0].length === 0) {
            throw new Error;
        }
        return res.status(403).sendFile(path.join(__dirname, 'public', 'redirectHomepage.html'))
    } catch (error) {
        res.clearCookie("sessionToken", {httpOnly: true, sameSite: "strict"})
        return res.status(401).send('Credenciais inválidas.')
    }
} 


module.exports = {
    auth, inverseAuth
}