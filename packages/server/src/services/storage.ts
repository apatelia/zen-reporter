import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Storage as GoogleCloudStorage } from '@google-cloud/storage';
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob';

export interface StoragePresignedUploadResult {
  uploadUrl: string;
  headers?: Record<string, string>;
}

export interface BlobStorageProvider {
  readonly providerName: string;
  readonly bucketOrContainerName: string;
  ensureContainerExists(): Promise<void>;
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds?: number
  ): Promise<StoragePresignedUploadResult>;
  getPresignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

/**
 * AWS S3 storage provider implementation (also supports MinIO, LocalStack, Cloudflare R2, Ceph, etc.).
 */
export class S3StorageProvider implements BlobStorageProvider {
  readonly providerName = 's3';
  readonly bucketOrContainerName: string;
  private readonly client: S3Client;

  constructor() {
    this.bucketOrContainerName = process.env.S3_BUCKET || 'zen-reports';
    const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9090';
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'mock_access_key';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'mock_secret_key';

    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  /**
   * Verifies that the S3 bucket exists, attempting creation if missing.
   *
   * @returns Resolves when check/creation completes.
   */
  async ensureContainerExists(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketOrContainerName }));
    } catch {
      console.log(`[zen-server] Creating S3 bucket: ${this.bucketOrContainerName}`);
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucketOrContainerName }));
      } catch (err) {
        console.warn(`[zen-server] S3 Bucket init notice:`, (err as Error).message);
      }
    }
  }

  /**
   * Generates a presigned PUT URL for uploading attachments to S3 directly from client.
   *
   * @param key - Destination object key in bucket.
   * @param contentType - MIME type of the file.
   * @param expiresInSeconds - Expiration time in seconds (default: 3600).
   * @returns Object with uploadUrl.
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 3600
  ): Promise<StoragePresignedUploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucketOrContainerName,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    return { uploadUrl };
  }

  /**
   * Generates a presigned GET URL for viewing private attachments in S3.
   *
   * @param key - Object key in bucket.
   * @param expiresInSeconds - Expiration time in seconds (default: 3600).
   * @returns Presigned download URL.
   */
  async getPresignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketOrContainerName,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}

/**
 * Google Cloud Storage provider implementation.
 */
export class GcpStorageProvider implements BlobStorageProvider {
  readonly providerName = 'gcp';
  readonly bucketOrContainerName: string;
  private readonly storage: GoogleCloudStorage;

  constructor() {
    this.bucketOrContainerName =
      process.env.GCS_BUCKET || process.env.GCP_STORAGE_BUCKET || 'zen-reports';

    const projectId = process.env.GCP_PROJECT_ID;
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    this.storage = new GoogleCloudStorage({
      projectId: projectId || undefined,
      keyFilename: keyFilename || undefined,
    });
  }

  /**
   * Verifies that the GCS bucket exists, attempting creation if missing.
   *
   * @returns Resolves when check/creation completes.
   */
  async ensureContainerExists(): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketOrContainerName);
      const [exists] = await bucket.exists();
      if (!exists) {
        console.log(`[zen-server] Creating GCS bucket: ${this.bucketOrContainerName}`);
        await bucket.create();
      }
    } catch (err) {
      console.warn(`[zen-server] GCS Bucket init notice:`, (err as Error).message);
    }
  }

  /**
   * Generates a presigned V4 PUT URL for uploading attachments to GCS.
   *
   * @param key - Destination object key in bucket.
   * @param contentType - MIME type of the file.
   * @param expiresInSeconds - Expiration time in seconds (default: 3600).
   * @returns Object with uploadUrl.
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 3600
  ): Promise<StoragePresignedUploadResult> {
    const bucket = this.storage.bucket(this.bucketOrContainerName);
    const file = bucket.file(key);

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + expiresInSeconds * 1000,
      contentType,
    });

    return { uploadUrl };
  }

  /**
   * Generates a presigned V4 GET URL for viewing attachments from GCS.
   *
   * @param key - Object key in bucket.
   * @param expiresInSeconds - Expiration time in seconds (default: 3600).
   * @returns Presigned download URL.
   */
  async getPresignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const bucket = this.storage.bucket(this.bucketOrContainerName);
    const file = bucket.file(key);

    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInSeconds * 1000,
    });

    return downloadUrl;
  }
}

/**
 * Azure Blob Storage provider implementation.
 */
export class AzureStorageProvider implements BlobStorageProvider {
  readonly providerName = 'azure';
  readonly bucketOrContainerName: string;
  private readonly blobServiceClient: BlobServiceClient;
  private readonly accountName: string;
  private readonly accountKey: string;

  constructor() {
    this.bucketOrContainerName =
      process.env.AZURE_STORAGE_CONTAINER || process.env.AZURE_CONTAINER_NAME || 'zen-reports';
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'mock_account';
    this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else {
      const credential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${this.accountName}.blob.core.windows.net`,
        credential
      );
    }
  }

  /**
   * Verifies that the Azure Blob container exists, attempting creation if missing.
   *
   * @returns Resolves when check/creation completes.
   */
  async ensureContainerExists(): Promise<void> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.bucketOrContainerName);
      await containerClient.createIfNotExists();
    } catch (err) {
      console.warn(`[zen-server] Azure Container init notice:`, (err as Error).message);
    }
  }

  /**
   * Generates a Shared Access Signature (SAS) PUT URL for uploading attachments to Azure Blob Storage.
   *
   * @param key - Destination blob key in container.
   * @param contentType - MIME type of the file.
   * @param expiresInSeconds - Expiration time in seconds (default: 3600).
   * @returns Object with uploadUrl and required Azure headers.
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 3600
  ): Promise<StoragePresignedUploadResult> {
    const containerClient = this.blobServiceClient.getContainerClient(this.bucketOrContainerName);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    const sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresInSeconds * 1000);

    const sasQuery = generateBlobSASQueryParameters(
      {
        containerName: this.bucketOrContainerName,
        blobName: key,
        permissions: BlobSASPermissions.parse('cw'), // create & write
        startsOn,
        expiresOn,
        contentType,
      },
      sharedKeyCredential
    ).toString();

    const uploadUrl = `${blockBlobClient.url}?${sasQuery}`;

    // Azure direct PUT requires 'x-ms-blob-type: BlockBlob'
    return {
      uploadUrl,
      headers: {
        'x-ms-blob-type': 'BlockBlob',
      },
    };
  }

  /**
   * Generates a Shared Access Signature (SAS) GET URL for downloading attachments from Azure Blob Storage.
   *
   * @param key - Blob key in container.
   * @param expiresInSeconds - Expiration time in seconds (default: 3600).
   * @returns Presigned SAS download URL.
   */
  async getPresignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const containerClient = this.blobServiceClient.getContainerClient(this.bucketOrContainerName);
    const blobClient = containerClient.getBlobClient(key);

    const sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresInSeconds * 1000);

    const sasQuery = generateBlobSASQueryParameters(
      {
        containerName: this.bucketOrContainerName,
        blobName: key,
        permissions: BlobSASPermissions.parse('r'), // read
        startsOn,
        expiresOn,
      },
      sharedKeyCredential
    ).toString();

    return `${blobClient.url}?${sasQuery}`;
  }
}

/**
 * Storage factory based on STORAGE_PROVIDER environment variable.
 * Defaults to 's3' (AWS, MinIO, S3Mock, LocalStack, R2, etc.).
 *
 * @returns Configured BlobStorageProvider instance.
 */
export function createStorageProvider(): BlobStorageProvider {
  const providerType = (
    process.env.STORAGE_PROVIDER ||
    process.env.CLOUD_PROVIDER ||
    's3'
  ).toLowerCase();

  switch (providerType) {
    case 'gcp':
    case 'gcs':
    case 'google':
      return new GcpStorageProvider();
    case 'azure':
    case 'blob':
      return new AzureStorageProvider();
    case 's3':
    case 'aws':
    default:
      return new S3StorageProvider();
  }
}

export const storage = createStorageProvider();
export const BUCKET_NAME = storage.bucketOrContainerName;

/**
 * Convenience wrapper generating a presigned upload URL using the active cloud storage provider.
 *
 * @param key - Object / blob key.
 * @param contentType - MIME type of the file.
 * @param expiresIn - Expiration time in seconds (default: 3600).
 * @returns Object with uploadUrl and optional provider headers.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<StoragePresignedUploadResult> {
  return storage.getPresignedUploadUrl(key, contentType, expiresIn);
}

/**
 * Convenience wrapper generating a presigned download URL using the active cloud storage provider.
 *
 * @param key - Object / blob key.
 * @param expiresIn - Expiration time in seconds (default: 3600).
 * @returns Presigned download URL string.
 */
export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  return storage.getPresignedDownloadUrl(key, expiresIn);
}
