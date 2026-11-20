-- Ulashish kartasi (3:4 JPEG, og:image): {"m": {"h": xesh, "t": vaqt}, "g<sha1>": {...}} — fayllar uploads/share/<id><kalit>.jpg
ALTER TABLE `invitations` ADD COLUMN `share_image` json NULL;
