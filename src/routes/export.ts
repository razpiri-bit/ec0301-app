import { Router } from 'express';
import path from 'path';
import { readFile } from 'fs/promises';
import archiver from 'archiver';
import puppeteer from 'puppeteer';

const r = Router();

r.get('/export/zip', async (_req, res) => {
  const manifest = JSON.parse(await readFile(path.join('products', 'manifest.json'), 'utf8'));
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="productos-ec0301.zip"');
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  for (const p of manifest.products) {
    archive.file(path.join('products', p.path), { name: p.path });
  }
  await archive.finalize();
});

r.get('/export/pdf', async (_req, res) => {
  const manifest = JSON.parse(await readFile(path.join('products', 'manifest.json'), 'utf8'));
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const pdfs: Buffer[] = [];
  for (const p of manifest.products) {
    const page = await browser.newPage();
    await page.goto(`file:${path.resolve('products', p.path)}`, { waitUntil: 'load' });
    pdfs.push(await page.pdf({ format: 'A4', printBackground: true }));
    await page.close();
  }
  await browser.close();
  const combined = Buffer.concat(pdfs); // para demo; en prod usa un merger
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="productos-ec0301.pdf"');
  res.end(combined);
});

export default r;

