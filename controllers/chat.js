require('dotenv').config()
const con = require('../database')
const jwt = require('jsonwebtoken')
const nanoid = require('nanoid')
async function newChat (req, res) {
    try {
        let conn = await con
        // verificar de novo pq vai que so fez a request sem passar pela 1° verificaçao (se ja existe essa dm)
        let k = await jwt.verify(req.cookies.sessionToken, process.env.chave)
        if (k.id == req.params.id) {
            return res.status(400).send('não é possível criar um chat consigo mesmo.')
        }
        let k2 = await conn.query('SELECT * FROM chats WHERE JSON_CONTAINS(participantes,?) = 1 AND JSON_CONTAINS(participantes,?) = 1', [JSON.stringify(k.id), JSON.stringify(parseInt(req.params.id))])
        console.log(k2[0])
        console.log('aq nao 1')
        if (k2[0].length > 0) {
            return res.status(403).send('Não autorizado.') 
        }
        await conn.beginTransaction()
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
}

async function postMensagem(req, res) {
    console.log(req.params.token)
    console.log('ola')
    let e=false
            try {
                let conn = await con
                let k = await jwt.verify(req.cookies.sessionToken, process.env.chave)
                e=true
                await conn.beginTransaction()
                let a = await conn.query('SELECT JSON_CONTAINS(participantes, ?) AS t FROM chats WHERE token=?', [JSON.stringify(k.id), req.params.token]) // verificacao pra ver se o usuario q fez essa request ta na conversa
                await conn.query('INSERT INTO mensagens (chat_token, msg, remetente, hora) VALUES (?,?,?, NOW())', [req.params.token, req.body.msg, k.id]) // chat_token é varchar e msg é text
                if (a[0][0].t === 1) {
                    await conn.commit()
                    return res.send(JSON.stringify({msg: req.body.msg, sessao: req.cookies.sessionToken}))       
                } else {
                    await conn.rollback()  
                    return res.status(403).send('Não autorizado.')
                }
            } catch(err) {
                console.log(err)
                if (e) {return res.status(401).send('Não autorizado.')} else {return res.status(500).send('Erro interno do servidor.')}
            }
    
}

async function chats(req, res) {
    try {
        let conn = await con
        console.log('iae')
        let k = await jwt.verify(req.cookies.sessionToken, process.env.chave)
        let a = await conn.query("SELECT * FROM chats WHERE JSON_CONTAINS(participantes,?) = 1", [JSON.stringify(k.id)])
        for (x of a[0]) {
            console.log('oi')
            if (x.tipo === 'DM') {
                let f = async (x, n) => {
                    let c = await conn.query('SELECT nome FROM usuarios WHERE id=?', [x.participantes[n]])
                    console.log(c[0][0].nome)
                    x.nome = c[0][0].nome 
                }
                switch (x.participantes[0] === k.id) {
                    case true:
                        await f(x, 1)
                        console.log('nsei')
                        break;
                    case false:
                        await f(x,0)
                        console.log('thau')
                        break;
                }
                // piores linhas de codigos que eu ja fiz na vida refatorar dps
            }
        }
        return res.send(a[0])
    } catch(err) {
        console.log(err)
        return res.status(500).send('erro interno do servidor.')
    }
}

async function chats2(req, res) {
    try {
        let conn = await con
        let k = await jwt.verify(req.cookies.sessionToken, process.env.chave)
        let a = await conn.query('SELECT * FROM chats WHERE JSON_CONTAINS(chats.participantes,?) = 1 AND token=?', [JSON.stringify(k.id), req.params.token])
        if (a[0][0].tipo === 'DM') {
            // retorna o nome do outro usuario ai pra colocar no display
        }
        if (a[0].length === 0) {
            return res.status(403).send('Usuário não participa do chat ou o chat não existe.')
        } else {
            return res.send()
        }
    } catch(err) {
        console.log(err)
        return res.status(500).send('erro intenro do servidor')
    }
}

async function verificacao_ec(req, res) {
    try {
        let conn = await con
        let b = parseInt(req.query.id)
        if (Number.isNaN(b)) {
            return res.status(500).send('erro interno.')
        }
        let k = await jwt.verify(req.cookies.sessionToken, process.env.chave)
        if (parseInt(k.id) === parseInt(b)) {
            return res.status(422).send('Não autorizado.')
        }
        let a = await conn.query('SELECT * FROM chats WHERE JSON_CONTAINS(participantes,?) = 1 AND JSON_CONTAINS(participantes, ?) AND tipo="DM"', [JSON.stringify(parseInt(k.id)), JSON.stringify(parseInt(b))])
        if (a[0].length === 0) {
            return res.status(403).send('Não autorizado.')
        } else {
            return res.send(a[0][0].token)
        }
    } catch(err) {
        console.log(err)
        return res.status(500).send('erro')
    }
}

async function verificacao_ec2(req, res){
    if (!req.query.emissor || !req.query.room) {
        return res.status(403).send('não autorizado.')
    } else {
        try {
            let conn = await con
            let b = await jwt.verify(req.query.emissor, process.env.chave)
            let a = await conn.query('SELECT * FROM chats WHERE JSON_CONTAINS(participantes, ?) = 1 AND token=?', [JSON.stringify(b.id), req.query.room])
            if (a[0].length === 0 ) {
                return res.status(403).send('não autorizado.')
            } else {
                return res.send('autorizado!')
            }
        } catch(err) {
            console.log(err)
            return res.status(500).send('erro interno do servidor.') // na vdd em tese o erro vai ser do jwt.verify apenas e nao do servidor mas vai que da erro
            // no servidor tlg ai pra prevenir deixa assim.
        }
        
    }
}

async function historico(req, res) {
    let conn = await con
    let k = jwt.verify(req.cookies.sessionToken, process.env.chave)
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
}

async function socket(req, res) {
    try {
        let k = await jwt.verify(req.cookies.sessionToken, process.env.chave)
        let conn = await con
        await conn.query('UPDATE sessoes_socket SET token=? WHERE id=?', [req.cookies.io, k.id])
        console.log(1)
        let a = await conn.query('SELECT token FROM chats WHERE JSON_CONTAINS(participantes, ?) = 1', [JSON.stringify(k.id)])
        console.log(a[0])
        let b = []
        for (x of a[0]) {
            b.push(x.token)
        }
        return res.send(JSON.stringify(b)) // o front vai receber um 200 OK e ai vai ja mandar um evento chamado 'novo' e conectar o novo socket a cada uma das salas.
    } catch(err) {
        console.log(err)
         return res.status(500).send('erro interno do servidor.')   
    }

}

module.exports = {
    historico,
    verificacao_ec,
    verificacao_ec2,
    chats2,
    chats,
    newChat,
    postMensagem,
    socket
}