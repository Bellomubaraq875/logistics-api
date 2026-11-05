import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const dir = join(process.cwd(), 'uploads');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

export const proofUploadOptions = {
  storage: diskStorage({
    destination: dir,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname) || '.png'}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: Express.Multer.File, cb: (e: Error | null, ok: boolean) => void) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new BadRequestException('Only image files are allowed'), false);
    }
    cb(null, true);
  },
};
