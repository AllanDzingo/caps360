import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER;

let blobServiceClient: BlobServiceClient | null = null;
let containerClient: ReturnType<BlobServiceClient['getContainerClient']> | null = null;

if (connectionString && containerName) {
  try {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Azure Blob Storage initialization failed:', err);
    blobServiceClient = null;
    containerClient = null;
  }
} else {
  // eslint-disable-next-line no-console
  console.error('Azure Blob Storage config missing: uploads will be disabled.');
}

export async function uploadBufferToBlob(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<{ url: string; blobName: string } | null> {
  if (!containerClient) {
    // eslint-disable-next-line no-console
    console.error('Azure Blob Storage not configured. Upload skipped.');
    return null;
  }
  const ext = originalName.split('.').pop();
  const blobName = `uploads/${uuidv4()}${ext ? '.' + ext : ''}`;
  const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimetype },
  });
  return {
    url: blockBlobClient.url,
    blobName,
  };
}

export function isBlobUploadEnabled() {
  return !!containerClient;
}
