const express = require('express')
const { historico, verificacao_ec2, verificacao_ec, chats2, chats, postMensagem, newChat , socket} = require('../controllers/chat')
const router = express.Router()



router.patch('/socket', socket) 

router.put('/newchat/:id', newChat)

router.post('/mensagem/:token', postMensagem)

router.get('/', chats)

router.get('/chats2/:token', chats2)


router.get('/verificacao_ec', verificacao_ec)

router.get('/verificacao_ec2', verificacao_ec2)

router.get('/historico/:token', historico)


module.exports = router