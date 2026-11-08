DO $$
BEGIN
  UPDATE storage.buckets
  SET
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ]::text[]
  WHERE id = 'social-post-media';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe el bucket privado social-post-media.';
  END IF;
END
$$;
