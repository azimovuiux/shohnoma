-- Boshlang‘ich 8 mavzu uchun muqova rasmlari (Figma «Maqola muqovalari» sahifasida yaratilgan, public/images/maqolalar/).
-- uz va ru versiyalari bir rasmni ishlatadi. Faqat muqovasi yo‘q maqolalarga qo‘yiladi — admin tanlagan rasm saqlanib qoladi.
UPDATE `articles` SET `cover` = '/images/maqolalar/elektron-taklifnoma-nima.jpg' WHERE `group_id` = 'seedgrp0000000000000001' AND (`cover` IS NULL OR `cover` = '');
--> statement-breakpoint
UPDATE `articles` SET `cover` = '/images/maqolalar/nikoh-toyi-taklifnoma-matni.jpg' WHERE `group_id` = 'seedgrp0000000000000002' AND (`cover` IS NULL OR `cover` = '');
--> statement-breakpoint
UPDATE `articles` SET `cover` = '/images/maqolalar/sunnat-toyi-taklifnoma-matni.jpg' WHERE `group_id` = 'seedgrp0000000000000003' AND (`cover` IS NULL OR `cover` = '');
--> statement-breakpoint
UPDATE `articles` SET `cover` = '/images/maqolalar/mehmonlar-royxati-va-javoblari.jpg' WHERE `group_id` = 'seedgrp0000000000000004' AND (`cover` IS NULL OR `cover` = '');
--> statement-breakpoint
UPDATE `articles` SET `cover` = '/images/maqolalar/fotiha-toyi-taklifnoma-matni.jpg' WHERE `group_id` = 'seedgrp0000000000000005' AND (`cover` IS NULL OR `cover` = '');
--> statement-breakpoint
UPDATE `articles` SET `cover` = '/images/maqolalar/toy-taklifnomasini-qachon-yuborish.jpg' WHERE `group_id` = 'seedgrp0000000000000006' AND (`cover` IS NULL OR `cover` = '');
--> statement-breakpoint
UPDATE `articles` SET `cover` = '/images/maqolalar/elektron-taklifnoma-shablonini-tanlash.jpg' WHERE `group_id` = 'seedgrp0000000000000007' AND (`cover` IS NULL OR `cover` = '');
--> statement-breakpoint
UPDATE `articles` SET `cover` = '/images/maqolalar/toyga-tayyorgarlik-royxati.jpg' WHERE `group_id` = 'seedgrp0000000000000008' AND (`cover` IS NULL OR `cover` = '');
