const express = require('express');
const corsMiddleware = require('./middlewares/corsMiddleware');
const recordRoutes = require('./routes/recordRoutes');
const formUploadRoutes = require('./routes/formUploadRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const chunkRoutes = require('./routes/chunkRoutes');
const downloadRoutes = require('./routes/downloadRoutes');

const app = express();

app.use(corsMiddleware);
app.use(express.json());

app.use(recordRoutes);
app.use(formUploadRoutes);
app.use(uploadRoutes);
app.use(chunkRoutes);
app.use(downloadRoutes);

const PORT = 3000;
app.listen(PORT, () => console.log(`服务器运行在 http://localhost:${PORT}`))
