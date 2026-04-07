const router = require('express').Router();
const { triageQuery, getQueryLogs, getQueryLogById } = require('../controllers/triage.controller');
const { protect } = require('../middleware/auth.middleware');
const redFlagMiddleware = require('../middleware/redFlag.middleware');
const { triageLimiter } = require('../middleware/rateLimiter');

router.post('/query', protect, triageLimiter, redFlagMiddleware, triageQuery);
router.get('/logs', protect, getQueryLogs);
router.get('/logs/:id', protect, getQueryLogById);

module.exports = router;
