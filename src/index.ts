import express from 'express';
import { json } from 'express';
import registerRoutes from './routes/register.js';
import verifyRoutes from './routes/verify.js';
import checkoutRoutes from './routes/checkout.js';
import webhookRoutes from './routes/webhooks.js';
import adminRoutes from './routes/admin.js';
import accessRoutes from './routes/access.js';
import productsRoutes from './routes/products.js';
import exportRoutes from './routes/export.js';

const app = express();
app.use(json());

// estáticos de productos primero
app.use('/api', productsRoutes);

app.use('/api', registerRoutes);
app.use('/api', verifyRoutes);
app.use('/api', checkoutRoutes);
app.use('/api', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', accessRoutes);
app.use('/api', exportRoutes);

const port = process.env.PORT || 3000;
app.get('/healthz', (_req, res) => res.status(200).send('ok'));
app.listen(port, () => console.log(`API listening on ${port}`));
