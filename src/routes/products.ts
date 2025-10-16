import { Router } from 'express';
import { readFile } from 'fs/promises';
import path from 'path';
import express from 'express';

const r = Router();
const PRODUCTS_DIR = path.resolve('products');

r.use('/products/static', express.static(PRODUCTS_DIR));

r.get('/products', async (_req, res) => {
  const manifest = JSON.parse(await readFile(path.join(PRODUCTS_DIR, 'manifest.json'), 'utf8'));
  res.json(manifest.products);
});

export default r;

