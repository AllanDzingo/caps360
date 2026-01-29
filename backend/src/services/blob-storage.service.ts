import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';


let blobServiceClient: BlobServiceClient | null = null;
let containerClient: ReturnType<BlobServiceClient['getContainerClient']> | null = null;
let blobConfigChecked = false;

function ensureBlobClient() {
  if (containerClient) return true;
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER;
  if (!connectionString || !containerName) {
    if (!blobConfigChecked) {
      // eslint-disable-next-line no-console
      console.warn('Azure Blob Storage config missing: uploads will be disabled.');
      blobConfigChecked = true;
    }
    return false;
  }
  try {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
    return true;
  } catch (err) {
    if (!blobConfigChecked) {
      // eslint-disable-next-line no-console
      console.warn('Azure Blob Storage initialization failed:', err);
      blobConfigChecked = true;
    }
    blobServiceClient = null;
    containerClient = null;
    return false;
  }
}


export async function uploadBufferToBlob(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<{ url: string; blobName: string } | null> {
  if (!ensureBlobClient() || !containerClient) {
    // eslint-disable-next-line no-console
    console.warn('Azure Blob Storage not configured. Upload skipped.');
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
  return ensureBlobClient() && !!containerClient;
}
