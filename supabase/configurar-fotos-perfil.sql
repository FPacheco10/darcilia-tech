-- Configuração do bucket existente.
-- As políticas de storage.objects são gerenciadas separadamente.

update storage.buckets
set
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
where id = 'fotos-perfil';