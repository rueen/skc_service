-- 创建任务报名表，记录用户报名任务的信息
CREATE TABLE IF NOT EXISTS `task_applications` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '报名ID',
  `task_id` bigint(20) NOT NULL COMMENT '关联任务ID',
  `member_id` bigint(20) NOT NULL COMMENT '关联会员ID',
  `status` varchar(20) NOT NULL DEFAULT 'applied' COMMENT '状态：applied-已报名，submitted-已提交，completed-已完成',
  `apply_time` datetime NOT NULL COMMENT '报名时间',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_member_id` (`member_id`),
  KEY `idx_status` (`status`),
  UNIQUE KEY `uk_task_member` (`task_id`, `member_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务报名表'; 