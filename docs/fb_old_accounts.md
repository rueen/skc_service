<!--
 * @Author: diaochan
 * @Date: 2025-04-07 10:32:22
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-07 10:42:33
 * @Description: 
-->
# FB老账号维护功能规格

## 1. 概述
本文档描述了FB老账号维护功能的需求和实现细节。该功能旨在管理FB老账号并建立它们与系统会员的关联关系。

## 2. 数据库结构

### 2.1 FB老账号表 (old_accounts_fb)
| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | bigint(20) | 主键，自增 |
| uid | varchar(100) | FB账户标识，唯一 |
| nickname | varchar(100) | FB昵称 |
| home_url | varchar(255) | FB链接 |
| member_id | bigint(20) | 关联会员ID，可为空 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 2.2 会员_FB老账号关联表 (member_old_accounts_fb)
| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | bigint(20) | 主键，自增 |
| member_id | bigint(20) | 会员ID |
| old_accounts_fb_id | bigint(20) | FB老账号ID |
| bind_time | datetime | 绑定时间 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

## 3. 管理后台API

### 3.1 FB老账号列表接口
- **路径**：`GET /api/admin/old-accounts-fb`
- **权限**：`account:list`
- **功能**：获取FB老账号列表，支持分页和筛选
- **请求参数**：
  - `page`：页码，默认1
  - `pageSize`：每页条数，默认20
  - `keyword`：搜索关键词(账户/昵称/链接)
  - `memberId`：关联会员ID
- **响应字段**：
  - `uid`：FB账户
  - `nickname`：FB昵称
  - `homeUrl`：FB链接
  - `memberId`：关联会员ID
  - `memberNickname`：关联会员昵称

### 3.2 导入FB老账号接口
- **路径**：`POST /api/admin/old-accounts-fb/import`
- **权限**：`account:list`
- **功能**：通过表格导入FB老账号，覆盖现有数据但保留已建立的关联关系
- **请求参数**：
  - `file`：Excel文件，包含列：FB账户(uid)、FB昵称(nickname)、FB链接(homeUrl)

### 3.3 添加FB老账号接口
- **路径**：`POST /api/admin/old-accounts-fb`
- **权限**：`account:list`
- **功能**：手动添加单个FB老账号
- **请求参数**：
  - `uid`：FB账户
  - `nickname`：FB昵称
  - `homeUrl`：FB链接

### 3.4 修改FB老账号接口
- **路径**：`PUT /api/admin/old-accounts-fb/:id`
- **权限**：`account:list`
- **功能**：修改FB老账号信息
- **请求参数**：
  - `uid`：FB账户
  - `nickname`：FB昵称
  - `homeUrl`：FB链接

### 3.5 删除FB老账号接口
- **路径**：`DELETE /api/admin/old-accounts-fb/:id`
- **权限**：`account:list`
- **功能**：删除FB老账号
- **限制**：已关联会员的FB老账号不允许删除

## 4. H5客户端功能

### 4.1 会员账号关联
- 在添加会员账号（`POST /api/h5/members/accounts`）和更新会员账号（`PUT /api/h5/members/accounts/:id`）时，根据入参 `uid` 自动建立与FB老账号的关联关系
- 一个 `uid` 只能绑定一个会员ID，不支持重复绑定
- 建立关联关系后，将关联会员的 `is_new` 字段设置为 0，表示该会员不再是新人

## 5. 业务规则
1. 通过UID匹配建立会员与FB老账号的关联
2. 一个FB老账号只能关联一个会员
3. 已关联会员的FB老账号不可删除
4. 导入数据时，覆盖所有未关联的老账号数据，保留已关联的记录
5. 当会员账号与FB老账号建立关联后，会员状态自动更新为非新人 