const con = require('./database')
const jwt = require('jsonwebtoken')
const path = require('path')


let a = async (req, res, next) => {
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
                        return res.status(404).sendFile(path.join(__dirname, 'public', 'oi.html'))
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
                    return res.status(401).sendFile(path.join(__dirname, 'public', 'oi.html'))
                }
    }
    return res.status(401).sendFile(path.join(__dirname, 'public', 'oi.html'))
}



module.exports = a