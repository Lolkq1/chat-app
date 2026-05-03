const router = require('express').Router()
const {mudarNome, mudarEmail, mudarBio, mudarSenha} = require('../controllers/config')
router.patch('/nome', mudarNome)
router.patch('/email', mudarEmail)
router.patch('/bio', mudarBio)
router.patch('/senha', mudarSenha)

module.exports = router