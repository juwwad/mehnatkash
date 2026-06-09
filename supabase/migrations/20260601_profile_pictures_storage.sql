-- Create storage bucket for profile pictures if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_pictures', 'profile_pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload their own profile pictures
CREATE POLICY "Users can upload own profile pictures"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile_pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create policy to allow everyone to view profile pictures
CREATE POLICY "Profile pictures are publicly viewable"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'profile_pictures');

-- Create policy to allow users to update their own profile pictures
CREATE POLICY "Users can update own profile pictures"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile_pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'profile_pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create policy to allow users to delete their own profile pictures
CREATE POLICY "Users can delete own profile pictures"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile_pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
