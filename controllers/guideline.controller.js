const Guideline = require('../models/Guideline');
const GuidelineChunk = require('../models/GuidelineChunk');
const { ingestGuideline } = require('../services/ingestion.service');
const path = require('path');

exports.uploadGuideline = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title, source, category, version, language } = req.body;
    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');

    const guideline = await Guideline.create({
      title: title || req.file.originalname,
      filename: req.file.originalname,
      filePath: req.file.path,
      fileType: ext,
      source: source || 'Unknown',
      category: category || 'general',
      version: version || '2024',
      language: language || 'en',
      uploadedBy: req.user._id,
    });

    try {
      const result = await ingestGuideline(guideline._id);
      res.status(201).json({ guideline, ingestion: result });
    } catch (ingestionError) {
      console.error('Ingestion failed:', ingestionError.message);
      res.status(201).json({
        guideline,
        ingestion: { error: ingestionError.message },
        message: 'File uploaded but ingestion failed. You can retry ingestion later.',
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.getGuidelines = async (req, res, next) => {
  try {
    const guidelines = await Guideline.find()
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email')
      .lean();
    res.json(guidelines);
  } catch (error) {
    next(error);
  }
};

exports.deleteGuideline = async (req, res, next) => {
  try {
    const guideline = await Guideline.findByIdAndDelete(req.params.id);
    if (!guideline) return res.status(404).json({ message: 'Guideline not found' });

    await GuidelineChunk.deleteMany({ guidelineId: guideline._id });
    res.json({ message: 'Guideline and associated chunks deleted' });
  } catch (error) {
    next(error);
  }
};

exports.reingest = async (req, res, next) => {
  try {
    const { guidelineId } = req.body;
    if (!guidelineId) {
      return res.status(400).json({ message: 'guidelineId is required' });
    }
    const result = await ingestGuideline(guidelineId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
