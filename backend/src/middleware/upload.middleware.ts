import multer from 'multer';

// Use memory storage only
const upload = multer({ storage: multer.memoryStorage() });

export default upload;
