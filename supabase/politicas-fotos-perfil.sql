-- Políticas existentes do bucket privado fotos-perfil.
-- Cada usuário acessa somente a pasta com seu próprio UUID.
-- Registro da configuração atual; não executar novamente
-- em um banco onde essas políticas já existem.

begin;

CREATE POLICY "Usuario atualiza propria foto"
ON storage.objects
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'fotos-perfil'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'fotos-perfil'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Usuario envia propria foto"
ON storage.objects
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fotos-perfil'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Usuario exclui propria foto"
ON storage.objects
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  bucket_id = 'fotos-perfil'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Usuario visualiza propria foto"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  bucket_id = 'fotos-perfil'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

commit;