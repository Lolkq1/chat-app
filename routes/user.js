const express = require('express')
const router = express.Router()
const {criar, login, mudar} = require('../controllers/user')
const auth = require('../auth')
router.post('/signup', criar)
router.post('/login', login)
router.patch('/config/:config', auth, mudar)

module.exports = router