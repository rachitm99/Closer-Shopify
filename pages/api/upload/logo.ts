import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import { getSessionFromRequest } from '../../../lib/auth-helpers';
import { storage, db, collections } from '../../../lib/firestore';
import fs from 'fs';

// Disable default body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate merchant
    const session = await getSessionFromRequest(req);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { shop } = session;

    // Parse the multipart form data
    const form = new IncomingForm();
    
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        return res.status(500).json({ error: 'Failed to parse upload' });
      }

      const uploadedFile = Array.isArray(files.logo) ? files.logo[0] : files.logo;
      
      if (!uploadedFile) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      try {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(uploadedFile.mimetype || '')) {
          return res.status(400).json({ error: 'Invalid file type. Only images allowed.' });
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (uploadedFile.size > maxSize) {
          return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }

        // Get current settings to check for existing logo
        const settingsDoc = await db.collection(collections.settings).doc(shop).get();
        const currentSettings = settingsDoc.data();
        
        // Delete old logo if exists
        if (currentSettings?.logoUrl) {
          try {
            // Extract file path from URL
            const urlParts = currentSettings.logoUrl.split('/o/')[1];
            if (urlParts) {
              const filePath = decodeURIComponent(urlParts.split('?')[0]);
              const bucket = storage.bucket();
              await bucket.file(filePath).delete();
              console.log('Deleted old logo:', filePath);
            }
          } catch (deleteError) {
            console.error('Error deleting old logo:', deleteError);
            // Continue even if deletion fails
          }
        }

        // Upload new file to Firebase Storage
        const bucket = storage.bucket();
        const fileName = `logos/${shop}_${Date.now()}_${uploadedFile.originalFilename}`;
        const file = bucket.file(fileName);

        // Read file from temporary location
        const fileBuffer = fs.readFileSync(uploadedFile.filepath);

        // Upload to Firebase Storage
        await file.save(fileBuffer, {
          metadata: {
            contentType: uploadedFile.mimetype || 'image/jpeg',
            metadata: {
              shop,
              uploadedAt: new Date().toISOString(),
            },
          },
        });

        // Make file publicly accessible
        await file.makePublic();

        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        // Update settings with new logo URL
        await db.collection(collections.settings).doc(shop).set(
          {
            logoUrl: publicUrl,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        // Clean up temporary file
        fs.unlinkSync(uploadedFile.filepath);

        console.log('Logo uploaded successfully for shop:', shop);

        return res.status(200).json({
          success: true,
          logoUrl: publicUrl,
        });
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
