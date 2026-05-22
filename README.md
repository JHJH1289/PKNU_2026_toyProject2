# Travelog

Travelog는 Spring Boot 백엔드와 React/Vite 프론트엔드로 구성된 여행 사진 공유 웹사이트입니다. 사용자는 게시물을 올리고, 다른 사람의 게시물을 피드에서 보고, 좋아요와 댓글을 남길 수 있습니다. 관리자는 관리자 모드에서 모든 게시물을 삭제할 수 있고, 사용자는 마이페이지에서 본인 게시물과 조회수 통계를 확인할 수 있습니다.

## 실행

백엔드:

```powershell
cd D:\code\toyProject2\drive
.\gradlew.bat bootRun
```

프론트엔드:

```powershell
cd D:\code\toyProject2\drive-front
npm run dev
```

검증:

```powershell
cd D:\code\toyProject2\drive
.\gradlew.bat test

cd D:\code\toyProject2\drive-front
npm run build
```

## 데이터베이스

현재 앱은 기존 `drive_db`를 사용하지 않고 새 DB `travel_share_db`를 사용합니다. 생성 순서는 [psql.txt](psql.txt)에 정리되어 있습니다.

필수 테이블:

- `users`: 로그인 사용자
- `admins`: 관리자 계정 식별
- `posts`: 여행 게시물
- `comments`: 게시물 댓글
- `post_likes`: 게시물 좋아요
- `post_views`: 사용자별 게시물 조회 기록

## EXIF 제거

EXIF 기능은 사용하지 않도록 제거했습니다.

- 삭제: `PhotoMetadataService.java`
- 삭제: `PhotoMetadata.java`
- 삭제: `drive-front/src/utils/exifFrame.js`
- 삭제: `ExifFramePreviewModal.jsx`
- 삭제: `ImageViewerModal.jsx`
- 삭제: EXIF 프레임용 카메라 로고 PNG
- 제거: `metadata-extractor` Gradle 의존성

기존 레거시 사진 API는 컴파일 호환을 위해 남아 있지만, 더 이상 EXIF를 읽거나 저장하지 않습니다.

## 백엔드 파일별 역할

### Application

| 파일 | 주요 메서드 | 역할 |
| --- | --- | --- |
| `DriveApplication.java` | `main` | Spring Boot 애플리케이션 시작점 |

### Config

| 파일 | 주요 메서드 | 역할 |
| --- | --- | --- |
| `SecurityConfig.java` | `securityFilterChain`, `passwordEncoder`, `authenticationManager`, `corsConfigurationSource` | JWT 인증, CORS, API 접근 권한 설정 |
| `AdminAccountInitializer.java` | `run` | 기본 관리자 계정과 `admins` 레코드 자동 생성 |

### Auth

| 파일 | 주요 메서드 | 역할 |
| --- | --- | --- |
| `AuthController.java` | `register`, `login` | 회원가입과 로그인 API |
| `AuthService.java` | `register`, `login` | 사용자 생성, 비밀번호 검증, JWT 발급 |
| `JwtTokenProvider.java` | `createToken`, `getUsername`, `validateToken` | JWT 생성과 검증 |
| `JwtAuthenticationFilter.java` | `doFilterInternal` | 요청 헤더의 Bearer 토큰을 읽어 인증 객체 생성 |
| `CustomUserDetailsService.java` | `loadUserByUsername` | Spring Security가 사용할 사용자 정보 조회 |

### Travelog Posts

| 파일 | 주요 메서드 | 역할 |
| --- | --- | --- |
| `PostController.java` | `feed`, `create`, `myPosts`, `myStats`, `adminPosts`, `like`, `comment`, `delete`, `image` | 게시물 피드, 업로드, 좋아요, 댓글, 삭제, 이미지 조회 API |
| `PostService.java` | `createPost`, `getFeed`, `getMyPosts`, `getAllPostsForAdmin`, `getMyStats`, `toggleLike`, `addComment`, `getPostImage`, `deletePost` | 게시물 핵심 비즈니스 로직 |
| `PostService.java` | `registerView` | `post_views`를 사용해 사용자별 1회만 조회수 증가 |
| `PostService.java` | `toPostResponse`, `findPost`, `normalizeOwnerId`, `normalizeText` | 응답 변환과 내부 유틸 |

### Entities

| 파일 | 주요 메서드 | 역할 |
| --- | --- | --- |
| `User.java` | 생성자, getter | 로그인 사용자 엔티티 |
| `Admin.java` | 생성자, getter | 관리자 식별 엔티티 |
| `Post.java` | 생성자, getter, `increaseViewCount` | 여행 게시물 엔티티 |
| `Comment.java` | 생성자, getter | 게시물 댓글 엔티티 |
| `PostLike.java` | 생성자, getter | 게시물 좋아요 엔티티 |
| `PostView.java` | 생성자, getter | 사용자별 게시물 조회 기록 엔티티 |

### Repositories

| 파일 | 주요 메서드 | 역할 |
| --- | --- | --- |
| `UserRepository.java` | `findByUsername`, `existsByUsername` | 사용자 조회 |
| `AdminRepository.java` | `existsByUsername` | 관리자 존재 확인 |
| `PostRepository.java` | `findAllByOrderByCreatedAtDescIdDesc`, `findAllByOwnerIdOrderByCreatedAtDescIdDesc`, `sumViewCountByOwnerId` | 피드, 마이페이지, 총 조회수 조회 |
| `CommentRepository.java` | `findAllByPostIdOrderByCreatedAtAscIdAsc` | 게시물별 댓글 조회 |
| `PostLikeRepository.java` | `findByPostIdAndOwnerId`, `countByPostId`, `existsByPostIdAndOwnerId`, `deleteAllByPost` | 좋아요 토글과 카운트 |
| `PostViewRepository.java` | `existsByPostIdAndViewerId` | 조회수 중복 증가 방지 |

### DTO

| 파일 | 역할 |
| --- | --- |
| `LoginRequest.java`, `LoginResponse.java` | 로그인 요청/응답 |
| `RegisterRequest.java`, `RegisterResponse.java` | 회원가입 요청/응답 |
| `AuthResponse.java` | 인증 상태 응답 |
| `PostResponse.java` | 피드에 내려가는 게시물 응답 |
| `CommentCreateRequest.java` | 댓글 생성 요청 |
| `CommentResponse.java` | 댓글 응답 |
| `UserStatsResponse.java` | 마이페이지 통계 응답 |
| `StoredFile.java` | 저장된 업로드 파일 정보 |

### Storage

| 파일 | 주요 메서드 | 역할 |
| --- | --- | --- |
| `StorageService.java` | `store`, `storeThumbnail`, `loadAsResource`, `delete` | 파일 저장소 인터페이스 |
| `LocalStorageService.java` | `store`, `storeThumbnail`, `loadAsResource`, `delete` | 로컬 디스크 이미지 저장/조회/삭제 |
| `PhotoThumbnailService.java` | `createThumbnail` | 레거시 사진 API 썸네일 생성 |

### Legacy Drive API

아래 파일은 기존 드라이브/폴더 기능의 잔여 코드입니다. 현재 Travelog 메인 UI는 `/api/posts`를 사용하며, 아래 API는 메인 흐름에서 사용하지 않습니다.

| 파일 | 역할 |
| --- | --- |
| `PhotoController.java`, `AdminPhotoController.java`, `ShareController.java` | 레거시 사진/폴더 API |
| `PhotoService.java` | 레거시 사진 업로드, 폴더, 휴지통, 중복 정리 로직. EXIF 추출은 제거됨 |
| `Photo.java`, `PhotoFolder.java`, `FolderShareLink.java` | 레거시 사진/폴더 엔티티 |
| `PhotoRepository.java`, `PhotoFolderRepository.java`, `FolderShareLinkRepository.java` | 레거시 사진/폴더 조회 |
| `PhotoResponse.java`, `PhotoUploadItemResponse.java`, `PhotoUploadBatchResponse.java`, `FolderResponse.java`, `FolderShareResponse.java`, `SharedFolderResponse.java`, `DuplicatePhotoGroupResponse.java`, `PhotoTagUpdateRequest.java`, `FolderCreateRequest.java`, `FolderRenameRequest.java`, `FolderOrderUpdateRequest.java`, `AdminFolderDeleteRequest.java` | 레거시 API 요청/응답 DTO |
| `ApiExceptionHandler.java` | API 예외를 JSON 응답으로 변환 |
| `HomeController.java` | 정적 홈 라우팅 |

## 프론트엔드 파일별 역할

### Entry

| 파일 | 주요 메서드/컴포넌트 | 역할 |
| --- | --- | --- |
| `main.jsx` | `createRoot(...).render(...)` | React 앱 시작점 |
| `App.jsx` | `App`, `handleLoginSuccess`, `handleLogout` | 로그인 세션 관리와 페이지 분기 |

### Pages

| 파일 | 주요 메서드/컴포넌트 | 역할 |
| --- | --- | --- |
| `pages/LoginPage.jsx` | `LoginPage`, `handleSubmit` | 로그인/회원가입 화면 |
| `pages/GalleryPage.jsx` | `GalleryPage`, `PostCard`, `PostComposer` | Travelog 메인 피드, 마이페이지, 관리자 모드, 게시물 작성 |
| `pages/GalleryPage.jsx` | `load`, `changeTab`, `handleCreatePost`, `handleLike`, `handleComment`, `handleDelete`, `replacePost`, `handleLogoutClick` | 피드 데이터 동기화와 사용자 액션 처리 |
| `pages/GalleryPage.jsx` | `submitComment`, `handleImageChange`, `handleSubmit` | 댓글 등록, 이미지 미리보기, 게시물 등록 |
| `pages/SharedFolderPage.jsx` | 레거시 공유 폴더 페이지 | 현재 Travelog 메인 흐름에서는 사용하지 않음 |

### API

| 파일 | 주요 메서드 | 역할 |
| --- | --- | --- |
| `api/authApi.js` | `login`, `register` | 인증 API 호출 |
| `api/postApi.js` | `fetchFeed`, `fetchMyPosts`, `fetchMyStats`, `fetchAdminPosts`, `createPost`, `togglePostLike`, `addPostComment`, `deletePost` | Travelog 게시물 API 호출 |
| `api/postApi.js` | `request`, `normalizePost`, `normalizePosts`, `normalizeImageUrl` | 공통 요청 처리와 이미지 URL 보정 |
| `api/photoApi.js`, `api/shareApi.js` | 레거시 사진/공유 API 호출 | 현재 Travelog 메인 흐름에서는 사용하지 않음 |

### Components

| 파일 | 주요 컴포넌트/메서드 | 역할 |
| --- | --- | --- |
| `components/AuthImage.jsx` | `AuthImage` | JWT Authorization 헤더로 보호 이미지 로드 |
| `components/PhotoStatus.jsx` | `PhotoStatus` | 상태 메시지 표시 |
| `components/ConfirmModal.jsx` | `ConfirmModal` | 확인 모달 |
| `components/admin/AdminPanel.jsx` | `AdminPanel`, `AdminPhotoFolderView` | 레거시 관리자 폴더 화면. EXIF 이미지 뷰어 제거됨 |
| `components/admin/AdminFolderList.jsx` | `AdminFolderList` | 레거시 관리자 폴더 목록 |
| `components/*Photo*`, `components/*Folder*`, `components/*Upload*`, `components/TrashPage.jsx`, `components/DuplicatePhotoModal.jsx`, `components/TagEditModal.jsx` | 레거시 사진 드라이브 UI | 현재 Travelog 메인 흐름에서는 사용하지 않음 |

### Hooks and Utils

| 파일 | 주요 메서드 | 역할 |
| --- | --- | --- |
| `hooks/useAutoDismissNotice.js` | `useAutoDismissNotice` | 레거시 알림 자동 닫기 훅 |
| `utils/photoCollection.js` | `filterFolders`, `filterPhotos`, `sortFolders`, `sortPhotosByDate` | 레거시 사진/폴더 정렬과 필터 |

### Styles

| 파일 | 역할 |
| --- | --- |
| `index.css` | 전체 CSS import |
| `styles/travel.css` | 현재 Travelog 피드 UI. 푸른색 계열 테마, 카드형 피드, 모바일 반응형 |
| `styles/base.css`, `layout.css`, `folders.css`, `photos.css`, `modals.css`, `admin.css`, `responsive.css` | 레거시 드라이브 UI 스타일과 공통 스타일 |

## 현재 주요 흐름

1. `LoginPage`에서 로그인하면 JWT, username, role이 `localStorage`에 저장됩니다.
2. `App`이 세션을 확인하고 `GalleryPage`를 렌더링합니다.
3. `GalleryPage`는 `/api/posts`로 전체 피드를 가져옵니다.
4. 게시물 이미지는 `AuthImage`가 Authorization 헤더를 붙여 `/api/posts/{id}/image`에서 가져옵니다.
5. 백엔드는 이미지 조회 시 `post_views`를 확인해서 같은 사용자의 중복 조회를 막고, 처음 볼 때만 `viewCount`를 증가시킵니다.
6. 좋아요는 `/api/posts/{id}/like`에서 토글되고, 프론트에는 하트 아이콘과 숫자만 표시됩니다.
7. 댓글은 기본으로 닫혀 있고, 댓글 아이콘을 누르면 목록과 입력창이 열립니다.
