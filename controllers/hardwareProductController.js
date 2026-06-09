const HardwareProduct = require('../models/HardwareProduct');

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

exports.getPublicProducts = async (req, res) => {
  try {
    const products = await HardwareProduct.findAllPublic();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getPublicProductBySlug = async (req, res) => {
  try {
    const product = await HardwareProduct.findBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getAdminProducts = async (req, res) => {
  try {
    const products = await HardwareProduct.findAllAdmin();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, slug, description, longDescription, price, stock, image, images, isActive, sortOrder } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (price === undefined || price === null || Number(price) < 0) {
      return res.status(400).json({ success: false, message: 'Valid price is required' });
    }

    const gallery = Array.isArray(images) ? images.filter(Boolean) : [];
    const product = await HardwareProduct.create({
      name,
      slug: slug || slugify(name),
      description,
      longDescription,
      price: Number(price),
      stock: Number(stock) || 0,
      image: image || gallery[0] || null,
      images: gallery,
      isActive: isActive !== false,
      sortOrder: Number(sortOrder) || 0,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'A product with this slug already exists' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await HardwareProduct.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { name, slug, description, longDescription, price, stock, image, images, isActive, sortOrder } = req.body;
    const gallery = images !== undefined
      ? (Array.isArray(images) ? images.filter(Boolean) : [])
      : undefined;

    const product = await HardwareProduct.update(id, {
      name,
      slug,
      description,
      longDescription,
      price: price !== undefined ? Number(price) : undefined,
      stock: stock !== undefined ? Number(stock) : undefined,
      image,
      images: gallery,
      isActive,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
    });

    res.json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'A product with this slug already exists' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No images uploaded' });
    }

    const urls = req.files.map((file) => `/uploads/hardware-products/${file.filename}`);
    res.json({ success: true, data: { urls } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Upload failed' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await HardwareProduct.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    await HardwareProduct.delete(id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
