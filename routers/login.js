const express = require('express')
const router = express.Router()
const {criar, login} = require('../controllers/login')
router.post('/criar', criar)

router.post('/', login)

module.exports = router