const router = require('express').Router();
const { getSessions, createSession, getSession, deleteSession } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/sessions', protect, getSessions);
router.post('/sessions', protect, createSession);
router.get('/sessions/:id', protect, getSession);
router.delete('/sessions/:id', protect, deleteSession);

module.exports = router;
