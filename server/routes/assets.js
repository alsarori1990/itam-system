import express from 'express';
import Asset from '../models/Asset.js';
import { authMiddleware, checkPermission } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// @route   GET /api/assets
// @desc    Get all assets with filters and pagination
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, type, status, location, branch } = req.query;
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (location) query.location = location;
    
    // Permission-based filtering
    if (req.user.branches && req.user.branches.length > 0) {
      query.location = { $in: req.user.branches };
    }
    
    // Execute query with pagination
    const assets = await Asset.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ lastUpdated: -1 })
      .lean();
    
    const total = await Asset.countDocuments(query);
    
    res.json({
      assets,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/assets/:id
// @desc    Get single asset
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const asset = await Asset.findOne({ id: req.params.id });
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/assets
// @desc    Create new asset
// @access  Private (requires create permission)
router.post('/', authMiddleware, checkPermission('assets', 'create'), async (req, res) => {
  try {
    const asset = new Asset({
      ...req.body,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });
    
    await asset.save();
    
    res.status(201).json(asset);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// @route   PUT /api/assets/:id
// @desc    Update asset
// @access  Private (requires update permission)
router.put('/:id', authMiddleware, checkPermission('assets', 'update'), async (req, res) => {
  try {
    const asset = await Asset.findOneAndUpdate(
      { id: req.params.id },
      { 
        ...req.body, 
        updatedBy: req.user._id,
        lastUpdated: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    res.json(asset);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// @route   DELETE /api/assets/:id
// @desc    Delete asset
// @access  Private (requires delete permission)
router.delete('/:id', authMiddleware, checkPermission('assets', 'delete'), async (req, res) => {
  try {
    const asset = await Asset.findOneAndDelete({ id: req.params.id });
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/assets/bulk
// @desc    Bulk import assets
// @access  Private
router.post('/bulk', authMiddleware, checkPermission('assets', 'create'), async (req, res) => {
  try {
    const { assets } = req.body;
    
    const createdAssets = await Asset.insertMany(
      assets.map(a => ({
        ...a,
        createdBy: req.user._id,
        updatedBy: req.user._id
      }))
    );
    
    res.status(201).json({
      message: `${createdAssets.length} assets imported successfully`,
      count: createdAssets.length
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// @route   POST /api/assets/upload
// @desc    Upload asset image
// @access  Private
router.post('/upload', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
    }

    // Return the file path
    const imagePath = `/uploads/assets/${req.file.filename}`;
    
    res.json({
      message: 'تم رفع الصورة بنجاح',
      imagePath: imagePath,
      filename: req.file.filename
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
