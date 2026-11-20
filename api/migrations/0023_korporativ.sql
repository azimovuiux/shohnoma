-- Yangi taklifnoma turi: «Korporativ tadbir» (korporativ). personA — tadbir nomi, personB — kompaniya / tashkilotchi.
ALTER TABLE `invitations` MODIFY `ceremony` enum('nikoh','fotiha','sunnat','tugilgan-kun','korporativ','boshqa') NOT NULL;
--> statement-breakpoint
ALTER TABLE `briefs` MODIFY `ceremony` enum('nikoh','fotiha','sunnat','tugilgan-kun','korporativ','boshqa') NOT NULL;
