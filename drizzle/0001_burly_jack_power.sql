CREATE TABLE `checklistItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`maintenanceId` int NOT NULL,
	`itemNumber` int NOT NULL,
	`equipmentName` varchar(255) NOT NULL,
	`status` enum('confere','nao_conferido','realizar_limpeza','realizar_reparo','realizar_troca') NOT NULL,
	`value` varchar(100),
	`correctiveAction` text,
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checklistItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stationId` int NOT NULL,
	`technicianId` int NOT NULL,
	`preventiveNumber` varchar(50) NOT NULL,
	`date` timestamp NOT NULL,
	`status` enum('draft','completed','approved') NOT NULL DEFAULT 'draft',
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklistItemId` int NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stations_id` PRIMARY KEY(`id`)
);
