const ChatSession = require('../models/ChatSession');

exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user._id })
      .select('title isActive createdAt updatedAt messages')
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = sessions.map(s => ({
      ...s,
      lastMessage: s.messages?.[s.messages.length - 1]?.content?.substring(0, 100) || '',
      messageCount: s.messages?.length || 0,
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

exports.createSession = async (req, res, next) => {
  try {
    const { title, patientContext } = req.body;
    const session = await ChatSession.create({
      userId: req.user._id,
      title: title || 'New Consultation',
      patientContext,
    });
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

exports.getSession = async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (error) {
    next(error);
  }
};

exports.deleteSession = async (req, res, next) => {
  try {
    const session = await ChatSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json({ message: 'Session deleted' });
  } catch (error) {
    next(error);
  }
};
