const express = require('express');
const { analyzeEvidence } = require('../controllers/aiController');

const router = express.Router();

router.post('/analyze', analyzeEvidence);

module.exports = router;
