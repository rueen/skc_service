-- 为channels表添加customFields字段
ALTER TABLE channels 
ADD COLUMN custom_fields JSON DEFAULT NULL COMMENT '自定义字段，如fansCount、friendsCount等'; 