const con = require('./database')
const jwt = require('jsonwebtoken')


let a = async (req, res, next) => {
    const conn = await con
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
                }
            }
}

module.exports = a