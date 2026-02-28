from __future__ import annotations

import logging
from io import BytesIO

from app.settings import settings

logger = logging.getLogger(__name__)


class S3MinioClient:
    """Thin wrapper around MinIO / S3-compatible object storage.

    When OBJECT_STORAGE_ENABLED=false (default) every mutating call is a no-op
    and every read returns None so the rest of the pipeline is unaffected.
    """

    def __init__(self) -> None:
        self._enabled = settings.OBJECT_STORAGE_ENABLED
        self._endpoint = settings.MINIO_ENDPOINT
        self._access_key = settings.MINIO_ACCESS_KEY
        self._secret_key = settings.MINIO_SECRET_KEY
        self._bucket = settings.MINIO_BUCKET
        self._secure = settings.MINIO_SECURE
        self._client: object | None = None  # minio.Minio

    def _get_client(self) -> object:
        if self._client is None:
            try:
                from minio import Minio  # type: ignore[import]

                self._client = Minio(
                    self._endpoint,
                    access_key=self._access_key,
                    secret_key=self._secret_key,
                    secure=self._secure,
                )
            except ImportError:
                logger.warning(
                    "minio package not installed. "
                    "Install it with: pip install minio"
                )
                raise
        return self._client

    def _ensure_bucket(self) -> None:
        client = self._get_client()
        found = client.bucket_exists(self._bucket)  # type: ignore[attr-defined]
        if not found:
            client.make_bucket(self._bucket)  # type: ignore[attr-defined]
            logger.info("Created MinIO bucket: %s", self._bucket)

    def put_object(self, object_name: str, data: bytes, content_type: str = "application/octet-stream") -> str | None:
        """Upload *data* under *object_name* and return the object path.

        Returns None when object storage is disabled.
        """
        if not self._enabled:
            return None

        try:
            self._ensure_bucket()
            client = self._get_client()
            client.put_object(  # type: ignore[attr-defined]
                self._bucket,
                object_name,
                BytesIO(data),
                length=len(data),
                content_type=content_type,
            )
            return f"{self._bucket}/{object_name}"
        except Exception as exc:  # noqa: BLE001
            logger.warning("MinIO put_object failed (%s): %s", object_name, exc)
            return None

    def get_object(self, object_name: str) -> bytes | None:
        """Download *object_name* and return raw bytes.

        Returns None when object storage is disabled or the object is missing.
        """
        if not self._enabled:
            return None

        try:
            client = self._get_client()
            response = client.get_object(self._bucket, object_name)  # type: ignore[attr-defined]
            try:
                return response.read()
            finally:
                response.close()
                response.release_conn()
        except Exception as exc:  # noqa: BLE001
            logger.warning("MinIO get_object failed (%s): %s", object_name, exc)
            return None

    def delete_object(self, object_name: str) -> bool:
        """Delete *object_name*.  Returns True on success, False otherwise."""
        if not self._enabled:
            return False

        try:
            client = self._get_client()
            client.remove_object(self._bucket, object_name)  # type: ignore[attr-defined]
            return True
        except Exception as exc:  # noqa: BLE001
            logger.warning("MinIO delete_object failed (%s): %s", object_name, exc)
            return False
