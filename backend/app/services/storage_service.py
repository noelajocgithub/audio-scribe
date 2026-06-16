"""MinIO storage service using aioboto3"""

import aioboto3
import os
import logging
from typing import Optional
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

MINIO_URL = os.getenv("MINIO_URL", "http://localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "audio-files")


class StorageService:
    """Service for managing file storage in MinIO"""
    
    def __init__(self):
        self.session = aioboto3.Session(
            aws_access_key_id=MINIO_ACCESS_KEY,
            aws_secret_access_key=MINIO_SECRET_KEY,
        )
        self.bucket = MINIO_BUCKET
    
    async def upload_file(self, file_path: str, storage_key: str) -> str:
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            file_size = os.path.getsize(file_path)
            logger.info(f"📤 Uploading file to MinIO: {storage_key} ({file_size} bytes)")
            
            async with self.session.client(
                's3',
                endpoint_url=MINIO_URL,
                region_name='us-east-1'
            ) as s3_client:
                with open(file_path, 'rb') as file_obj:
                    await s3_client.put_object(
                        Bucket=self.bucket,
                        Key=storage_key,
                        Body=file_obj,
                        ContentType=self._get_content_type(storage_key)
                    )
            
            logger.info(f"✅ File uploaded successfully: {storage_key}")
            return storage_key
            
        except FileNotFoundError as e:
            logger.error(f"❌ File not found: {e}")
            raise
        except ClientError as e:
            error_msg = f"MinIO upload failed: {e}"
            logger.error(f"❌ {error_msg}")
            raise StorageError(error_msg)
        except Exception as e:
            error_msg = f"Upload failed: {str(e)}"
            logger.error(f"❌ {error_msg}")
            raise StorageError(error_msg)
    
    async def download_file(self, storage_key: str, local_path: str) -> str:
        try:
            logger.info(f"📥 Downloading file from MinIO: {storage_key}")
            
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            
            async with self.session.client(
                's3',
                endpoint_url=MINIO_URL,
                region_name='us-east-1'
            ) as s3_client:
                response = await s3_client.get_object(
                    Bucket=self.bucket,
                    Key=storage_key
                )
                
                with open(local_path, 'wb') as file_obj:
                    async for chunk in response['Body'].iter_chunks():
                        file_obj.write(chunk)
            
            logger.info(f"✅ File downloaded successfully: {local_path}")
            return local_path
            
        except ClientError as e:
            error_msg = f"MinIO download failed: {e}"
            logger.error(f"❌ {error_msg}")
            raise StorageError(error_msg)
        except Exception as e:
            error_msg = f"Download failed: {str(e)}"
            logger.error(f"❌ {error_msg}")
            raise StorageError(error_msg)
    
    async def stream_file(self, storage_key: str, chunk_size: int = 64 * 1024):
        """Yield an object's bytes from MinIO for streaming playback.

        The S3 client context stays open for the lifetime of the generator so the
        underlying body can be read incrementally (used by StreamingResponse).
        """
        async with self.session.client(
            's3',
            endpoint_url=MINIO_URL,
            region_name='us-east-1'
        ) as s3_client:
            response = await s3_client.get_object(Bucket=self.bucket, Key=storage_key)
            async for chunk in response['Body'].iter_chunks(chunk_size):
                yield chunk

    async def delete_file(self, storage_key: str) -> None:
        try:
            logger.info(f"🗑️ Deleting file from MinIO: {storage_key}")
            
            async with self.session.client(
                's3',
                endpoint_url=MINIO_URL,
                region_name='us-east-1'
            ) as s3_client:
                await s3_client.delete_object(
                    Bucket=self.bucket,
                    Key=storage_key
                )
            
            logger.info(f"✅ File deleted successfully: {storage_key}")
            
        except ClientError as e:
            logger.warning(f"⚠️ MinIO deletion warning: {e}")
        except Exception as e:
            logger.warning(f"⚠️ Deletion warning: {e}")
    
    async def get_presigned_url(self, storage_key: str, expiration: int = 3600) -> str:
        try:
            async with self.session.client(
                's3',
                endpoint_url=MINIO_URL,
                region_name='us-east-1'
            ) as s3_client:
                url = await s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.bucket, 'Key': storage_key},
                    ExpiresIn=expiration
                )
            
            logger.info(f"🔗 Generated presigned URL for: {storage_key}")
            return url
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to generate presigned URL: {e}")
            return ""
    
    @staticmethod
    def _get_content_type(filename: str) -> str:
        content_types = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'aac': 'audio/aac',
            'm4a': 'audio/mp4',
            'mp4': 'audio/mp4',
            'webm': 'audio/webm',
            'aiff': 'audio/aiff',
            'pcm': 'audio/pcm'
        }
        
        ext = filename.split('.')[-1].lower()
        return content_types.get(ext, 'application/octet-stream')


class StorageError(Exception):
    pass


_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    global _storage_service
    
    if _storage_service is None:
        _storage_service = StorageService()
    
    return _storage_service
